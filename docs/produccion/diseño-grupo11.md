# Diseño de Infraestructura y Observabilidad para Producción
**Fase 2 - Trabajo Grupal**

## 2.1. Diseño de la infraestructura Docker

### a) `packages/api/Dockerfile.prod`
Se implementará un patrón Multi-stage build de 3 etapas para minimizar el tamaño final y mejorar la seguridad.

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `deps` | `node:22-alpine` | Instalar exclusivamente las dependencias de producción utilizando `npm ci --omit dev`. |
| **Stage 2** | `build` | `node:22-alpine` | Instalar todas las dependencias, compilar el código TypeScript y generar el JavaScript transpilado en la carpeta `dist`. |
| **Stage 3** | `runtime` | `node:22-alpine` | Imagen final. Solo contendrá el runtime, el JS compilado y los `node_modules` de producción. Se configurará un usuario no-root (`node`). |

**Requisitos no funcionales:**
* **Seguridad:** Ejecución bajo el usuario `node` (no-root).
* **Disponibilidad:** Configuración de un `HEALTHCHECK` que consulte a `localhost:3000`.
* **Optimización:** Uso de un archivo `.dockerignore` estricto para excluir `node_modules`, `.git` y archivos locales.

---

### b) `packages/web/Dockerfile.prod`
Para el frontend web, se utilizará Nginx para servir los archivos estáticos compilados, evitando el uso del runtime de Node en producción.

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `deps` | `node:22-alpine` | Instalar las dependencias necesarias para la construcción. |
| **Stage 2** | `build` | `node:22-alpine` | Ejecutar el empaquetador (`vite build`) para generar los assets estáticos minimizados. |
| **Stage 3** | `runtime` | `nginx:stable-alpine` | Servir los archivos estáticos desde `/usr/share/nginx/html`. |

**Requisitos no funcionales:**
* **Servidor:** Uso de Nginx configurado para SPA (Single Page Application).
* **Performance:** Habilitación de compresión Gzip y headers de caché para assets.
* **Disponibilidad:** `HEALTHCHECK` contra `localhost:80`.

---

### c) `docker-compose.prod.yml`
Configuración de los servicios para el entorno productivo con políticas estrictas de seguridad y recursos.

| Aspecto | Requisito a implementar |
| :--- | :--- |
| **Resource limits** | Límites de CPU y memoria definidos explícitamente por cada servicio (`deploy.resources.limits`). |
| **Healthchecks** | Evaluaciones periódicas para la API (HTTP) y la Base de Datos (`pg_isready`). |
| **Seguridad** | `read_only: true` (sistema de archivos inmutable), `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE`, `security_opt: no-new-privileges`. |
| **Logging** | Driver `json-file` con rotación configurada (`max-size: 10m`, `max-file: 3`) para evitar llenar el disco. |
| **Red** | Red interna personalizada (`bridge` custom), no aislando servicios innecesariamente en la red default. |
| **Secrets** | Variables sensibles inyectadas vía archivo `.env` externo o Docker Secrets, sin hardcodear en el YAML. |

---

## 2.2. Diseño de la observabilidad

### a) Métricas RED a capturar
Se integrarán métricas personalizadas enfocadas en la experiencia y rendimiento:

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| :--- | :--- | :--- | :--- |
| **Rate** | Counter | Requests por segundo para medir la carga de tráfico. | `method`, `route`, `status`  |
| **Errors** | Counter | Tasa de error (respuestas HTTP 4xx y 5xx). | `method`, `route`, `status`  |
| **Duration** | Histogram | Latencia de las requests en milisegundos. | `method`, `route`  |

*Adicionales:*
* `process.memory.usage` (Gauge): Memoria actual del proceso de la API.
* `http.requests.active` (Gauge): Cantidad de requests concurrentes en vuelo.

### b) OpenTelemetry SDK
El SDK se inicializará en la API antes del arranque de Fastify, configurando:
1. `PrometheusExporter` corriendo en el puerto 9464.
2. Auto-instrumentaciones para los módulos de HTTP y Fastify.
3. Instanciación del `MeterProvider` para inyectar los contadores RED manuales.

### c) Dashboard RED en Grafana
Se construirá un dashboard interactivo en Grafana con los siguientes 6 paneles:

1. **Requests por segundo:** Time series (tráfico actual).
2. **Tasa de error:** Time series (% de fallos).
3. **Latencia p95/p99:** Time series (performance percibida).
4. **Por status code:** Stacked area (distribución de respuestas 200 vs 400/500).
5. **Memoria del proceso:** Time series (consumo de recursos).
6. **Endpoints más lentos:** Bar chart horizontal (detección de cuellos de botella).