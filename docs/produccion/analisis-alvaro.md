# TP Integrador - Actividad 4: Preparando para Producción
**Alumno:** Alvaro
**Fase 1:** Analizar y proponer

---

## 1.1. Analizar la infraestructura Docker actual

Tras analizar los archivos de configuración actuales (`docker-compose.yml`, `api/Dockerfile` y `web/Dockerfile`), se identificaron múltiples vulnerabilidades y malas prácticas al considerarlos para un entorno de producción. A continuación se detallan los 5 problemas principales:

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| :--- | :--- | :--- | :--- |
| **Credenciales hardcodeadas** | `docker-compose.yml` (líneas 6, 7 y 24) | Alto | Eliminar las credenciales del código fuente. Inyectarlas utilizando un archivo `.env` externo o mediante Docker Secrets para evitar su exposición en el control de versiones. |
| **Ejecución como usuario Root** | `api/Dockerfile` y `web/Dockerfile` | Alto | Especificar un usuario sin privilegios agregando la instrucción `USER node` antes del `CMD` para mitigar el impacto de una posible escalada de privilegios. |
| **Imágenes pesadas (Single-stage)** | `api/Dockerfile` y `web/Dockerfile` | Alto | Implementar **Multi-stage builds**. Compilar en una etapa inicial y copiar únicamente los binarios generados y las dependencias de producción (`npm ci --omit dev`) hacia una imagen final liviana. |
| **Falta de límites de recursos** | `docker-compose.yml` (Definición de servicios) | Medio | Configurar directivas de recursos (`deploy.resources.limits`) para restringir la cantidad de CPU y Memoria que cada contenedor puede utilizar, previniendo ataques de denegación de servicio (DoS) por agotamiento de recursos. |
| **Uso de servidores de desarrollo** | `docker-compose.yml` (líneas 28, 48) y CMD | Alto | Para la API, ejecutar el código transpilado a JavaScript nativo (`node dist/app.js`). Para la Web, compilar los estáticos y servirlos utilizando **Nginx**. Además, se deben eliminar los mapeos de volúmenes locales de código fuente. |

---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
**OpenTelemetry (OTel)** es un framework de observabilidad de código abierto (agnóstico a los proveedores) que proporciona APIs, SDKs y herramientas para generar, recolectar y exportar datos de telemetría. 

La diferencia principal radica en su propósito: OpenTelemetry se encarga de la **instrumentación y recolección** de los datos, pero no cuenta con un backend propio para almacenarlos. **Prometheus**, por el contrario, es una base de datos de series temporales (TSDB) y un sistema de monitoreo diseñado específicamente para **almacenar y consultar** esas métricas.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?
Los tres pilares fundamentales de la observabilidad son:
1. **Métricas:** Agregaciones numéricas de datos a lo largo del tiempo (ej: uso de CPU, cantidad de requests).
2. **Logs:** Registros de texto inmutables y con marca de tiempo sobre eventos discretos.
3. **Traces (Trazas):** Representación del ciclo de vida completo de una solicitud a medida que viaja a través de sistemas distribuidos.

OpenTelemetry aborda **los tres pilares**, proporcionando un estándar unificado para instrumentar, generar y exportar métricas, logs y trazas mediante un único protocolo y conjunto de herramientas.

### Expliquen el concepto de métricas RED. ¿Para qué sirve cada una?
El método RED es un enfoque para monitorear microservicios basado en tres métricas fundamentales que reflejan la experiencia del usuario final:
* **Rate (Tasa):** Mide la cantidad de solicitudes por segundo. Sirve para entender la carga de tráfico actual que está soportando el servicio.
* **Errors (Errores):** Mide la cantidad (o el porcentaje) de solicitudes que fallan (códigos HTTP 4xx y 5xx). Sirve para evaluar la disponibilidad y la tasa de fallos de la aplicación.
* **Duration (Duración):** Mide el tiempo que tarda el servicio en responder a una solicitud (latencia). Sirve para evaluar el rendimiento percibido por el usuario y detectar cuellos de botella (generalmente analizando los percentiles p95 o p99).

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?
El **OTLP** es el protocolo de transporte estándar y de propósito general diseñado específicamente para enviar datos de telemetría (métricas, logs y trazas) desde la aplicación instrumentada hacia un backend o colector.

**Ventaja principal:** Evita el acoplamiento con el proveedor (Vendor Lock-in). Si la aplicación exporta directamente en el formato de Prometheus y el día de mañana el equipo decide migrar a Datadog o New Relic, se debería reescribir el código de la aplicación. Utilizando OTLP, la aplicación envía un formato universal estandarizado a un "OpenTelemetry Collector", y es este colector el encargado de traducir y derivar la información a Prometheus o cualquier otro backend sin tocar el código fuente.

### ¿Cómo se relaciona OpenTelemetry con Grafana?
Se relacionan formando un stack completo de observabilidad (Generación -> Almacenamiento -> Visualización).
 
OpenTelemetry se integra en el código fuente para generar las métricas. Luego, estas métricas son scrapeadas (recolectadas) y almacenadas por Prometheus. Finalmente, **Grafana** se conecta a la base de datos de Prometheus como origen de datos (Data Source) para consultar esas métricas mediante PromQL y construir los dashboards interactivos y paneles visuales que permiten a los desarrolladores analizar el estado del sistema en tiempo real.