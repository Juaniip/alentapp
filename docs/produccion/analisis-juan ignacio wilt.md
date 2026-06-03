# TP Integrador - Actividad 4: Preparando para Producción
**Alumno:** Wilt Juan Ignacio
**Fase 1:** Analizar y proponer

---

## 1.1. Analizar la infraestructura Docker actual

Tras analizar los archivos de configuración actuales (`docker-compose.yml`, `packages/api/Dockerfile` y `packages/web/Dockerfile`), se identificaron múltiples vulnerabilidades y malas prácticas al considerarlos para un entorno de producción. A continuación se detallan los 5 problemas principales:

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| :--- | :--- | :--- | :--- |
| **Credenciales hardcodeadas en texto plano** | `docker-compose.yml` líneas 6-7 (`POSTGRES_USER`, `POSTGRES_PASSWORD`) y línea 24 (`DATABASE_URL`) | Alto | Nunca versionar secretos en el código fuente. Extraer todas las credenciales a un archivo `.env` ignorado por Git y referenciarlas con la sintaxis `${VAR}`. Para producción, la solución robusta es usar **Docker Secrets** (`secrets:` en el compose) o un vault externo (HashiCorp Vault, AWS Secrets Manager). El archivo `.env` sirve solo para desarrollo local. Ejemplo: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` en el compose, con el valor real únicamente en el `.env` local nunca commiteado. |
| **Ejecución del proceso como usuario `root`** | `packages/api/Dockerfile` y `packages/web/Dockerfile` (ambos carecen de instrucción `USER`) | Alto | La imagen base `node:20-alpine` incluye un usuario sin privilegios llamado `node` (UID 1000). Sin especificar `USER node`, el proceso corre como `root` dentro del contenedor, violando el principio de mínimo privilegio: ante una vulnerabilidad RCE, el atacante obtiene acceso root al filesystem del contenedor. Solución: agregar `USER node` antes de la instrucción `CMD` en ambos Dockerfiles. En el Dockerfile de producción, también asegurar el ownership correcto con `RUN chown -R node:node /app` antes del cambio de usuario. |
| **Ausencia de multi-stage build: imágenes con toolchain de desarrollo en producción** | `packages/api/Dockerfile` (etapa única, instala `devDependencies`) y `packages/web/Dockerfile` (etapa única, no compila con Vite ni usa Nginx) | Alto | Una imagen single-stage incluye el compilador TypeScript, `tsx`, todos los dev packages y las herramientas de build, superando fácilmente los 800 MB. La solución es implementar **multi-stage builds**: **Stage 1 (`deps`):** `npm ci --omit=dev` para instalar solo dependencias de producción. **Stage 2 (`build`):** compilar TypeScript a JavaScript nativo con `tsc`. **Stage 3 (`runtime`):** imagen `node:22-alpine` limpia que recibe únicamente el directorio `dist/` compilado y los `node_modules` de producción. Para el frontend: Stage 2 ejecuta `vite build` y Stage 3 usa `nginx:stable-alpine` para servir los estáticos, eliminando Node.js completamente de la imagen final. Resultado esperado: reducción de ~800 MB a ~50-80 MB. |
| **Orden de instrucciones rompe el cache de capas de Docker** | `packages/api/Dockerfile` líneas 10-14: se copia `packages/web/package.json` siendo irrelevante para la API; `packages/web/Dockerfile` líneas 3-5: no se copia el `package.json` de `shared` | Medio | El mecanismo de cache de Docker invalida todas las capas posteriores cuando una capa cambia. En el `api/Dockerfile`, incluir el `package.json` del workspace `web` hace que cualquier cambio en el frontend invalide el `RUN npm install` de la API innecesariamente. En el `web/Dockerfile`, omitir el `package.json` de `shared` puede causar inconsistencias si ese workspace cambia. El orden óptimo es copiar **exactamente y solo** los manifiestos de los workspaces que afectan a cada servicio: `COPY package*.json ./` → `COPY packages/api/package*.json ./packages/api/` → `COPY packages/shared/package*.json ./packages/shared/` → `RUN npm ci` → `COPY . .`. |
| **Ausencia de límites de recursos y filesystem sin restricción de escritura** | `docker-compose.yml`: servicios `api` y `web` sin directiva `deploy.resources.limits`, sin `read_only: true`, sin `cap_drop` ni `security_opt` | Medio | Sin límites de CPU y memoria, un bug o ataque DoS puede consumir todos los recursos del host, afectando al resto de los servicios incluida la base de datos. Sin `read_only: true`, un proceso comprometido puede escribir archivos arbitrarios en el filesystem del contenedor. Solución para el `docker-compose.prod.yml`: agregar `deploy.resources.limits` (ej. `cpus: '0.5'`, `memory: 256M` para la API), configurar `read_only: true` con `tmpfs` para `/tmp`, agregar `cap_drop: [ALL]` para descartar todas las Linux capabilities y `cap_add: [NET_BIND_SERVICE]` solo donde sea estrictamente necesario, y `security_opt: [no-new-privileges:true]` para prevenir escaladas de privilegios vía `setuid`. |

---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un framework de observabilidad de código abierto y agnóstico a proveedores que proporciona APIs, SDKs y herramientas estandarizadas para generar, recolectar y exportar datos de telemetría desde aplicaciones.

La diferencia principal radica en el propósito de cada herramienta: OpenTelemetry es responsable de la **instrumentación y recolección** de datos, pero no cuenta con un backend propio para almacenarlos ni consultarlos. **Prometheus**, por el contrario, es una base de datos de series temporales (TSDB) y un sistema de monitoreo diseñado específicamente para **almacenar y consultar** esas métricas mediante su lenguaje de consulta PromQL. En términos prácticos, OTel genera los datos y Prometheus los guarda.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares fundamentales de la observabilidad son:

1. **Métricas:** Agregaciones numéricas de datos a lo largo del tiempo (ej: uso de CPU, cantidad de requests por segundo, tasa de errores).
2. **Logs:** Registros de texto inmutables y con marca de tiempo sobre eventos discretos ocurridos en el sistema.
3. **Traces (Trazas):** Representación del ciclo de vida completo de una solicitud a medida que atraviesa múltiples servicios en un sistema distribuido, permitiendo identificar cuellos de botella y puntos de fallo con precisión.

OpenTelemetry aborda **los tres pilares simultáneamente**, siendo una de sus principales ventajas frente a herramientas anteriores que cubrían solo uno o dos. Proporciona un estándar unificado para instrumentar, generar y exportar métricas, logs y trazas mediante un único protocolo y conjunto de herramientas.

### Expliquen el concepto de métricas RED. ¿Para qué sirve cada una?

El método RED es un enfoque para monitorear microservicios orientado a reflejar directamente la experiencia del usuario final, basado en tres métricas fundamentales:

- **Rate (Tasa):** Mide la cantidad de solicitudes procesadas por segundo. Sirve para entender la carga de tráfico actual que soporta el servicio y detectar picos o caídas inesperadas de demanda.
- **Errors (Errores):** Mide la cantidad o porcentaje de solicitudes que fallan (códigos HTTP 4xx y 5xx). Sirve para evaluar la disponibilidad del servicio y la tasa de fallos, siendo un indicador directo de la experiencia del usuario.
- **Duration (Duración):** Mide el tiempo que tarda el servicio en responder a cada solicitud (latencia). Sirve para evaluar el rendimiento percibido y detectar cuellos de botella; generalmente se analiza a través de percentiles estadísticos como p95 y p99 para capturar los casos más lentos, no solo el promedio.

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

El **OTLP (OpenTelemetry Protocol)** es el protocolo de transporte estándar y de propósito general diseñado específicamente por el proyecto OTel para enviar datos de telemetría (métricas, logs y trazas) desde la aplicación instrumentada hacia un collector o backend.

**Ventaja principal frente a la exportación directa a Prometheus:** elimina el acoplamiento con el proveedor (_Vendor Lock-in_). Si la aplicación exporta directamente en el formato de Prometheus y el equipo decide migrar a Datadog, New Relic o cualquier otro backend, se debe reescribir el código de instrumentación de la aplicación. Utilizando OTLP, la aplicación envía un formato universal a un **OpenTelemetry Collector**, y es este componente intermedio el encargado de traducir y derivar la información a Prometheus, Jaeger, o cualquier otro backend sin modificar el código fuente de la aplicación.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Se relacionan formando un stack completo de observabilidad que sigue el flujo: **Generación → Almacenamiento → Visualización**.

OpenTelemetry se integra en el código fuente de la aplicación para instrumentar y generar los datos de telemetría. Esos datos son exportados vía OTLP hacia un collector y luego scrapeados y almacenados por **Prometheus** como base de datos de series temporales. Finalmente, **Grafana** se conecta a Prometheus como origen de datos (_Data Source_) y permite construir dashboards interactivos consultando las métricas mediante PromQL, ofreciendo a los desarrolladores y operadores una visualización en tiempo real del estado y rendimiento del sistema.
