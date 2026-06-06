# TP Integrador - Actividad 4: Preparando para Producción
**Alumno:** Chiappini Valentino
**Fase 1:** Analizar y proponer

## 1.1 Problemas identificados en la configuración Docker actual

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | La imagen base `node:20-alpine` no fija una versión exacta (digest), lo que puede causar builds no reproducibles si Alpine actualiza la imagen | `packages/api/Dockerfile` y `packages/web/Dockerfile` línea 1 | Medio | Usar `node:20.19.0-alpine` con versión exacta o agregar `--platform` fijo |
| 2 | La API y el frontend corren como **root** (no se define usuario no-root), lo que representa un riesgo de seguridad crítico si el proceso es comprometido | Ambos Dockerfiles — no hay instrucción `USER` | Alto | Agregar `RUN addgroup -S appgroup && adduser -S appuser -G appgroup` y luego `USER appuser` |
| 3 | El Dockerfile instala **todas** las dependencias (incluyendo devDependencies como `vitest`, `tsx`, `@types/*`) en la imagen final, inflando innecesariamente su tamaño | `packages/api/Dockerfile` línea `RUN npm install` | Alto | Usar multi-stage build: instalar `devDependencies` solo en stage de build, copiar solo `node_modules` de producción al stage final |
| 4 | No hay **límites de recursos** (CPU/memoria) en `docker-compose.yml`, lo que permite que un servicio consuma todos los recursos del host | `docker-compose.yml` — todos los servicios | Alto | Agregar sección `deploy.resources.limits` con `cpus` y `memory` por servicio |
| 5 | Las credenciales de la base de datos están **hardcodeadas** en `docker-compose.yml` (`POSTGRES_PASSWORD: password123`, `DATABASE_URL`), lo que es un riesgo de seguridad si el archivo se versiona | `docker-compose.yml` líneas 7-8 y 25 | Alto | Mover los valores sensibles a un archivo `.env` (no versionado) y referenciarlos con `${VARIABLE}` |

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry (OTel) es un framework open-source y vendor-neutral que provee APIs, SDKs y herramientas para **instrumentar** aplicaciones y recolectar datos de observabilidad (métricas, trazas y logs). Es el estándar del ecosistema CNCF para instrumentación.

Prometheus, en cambio, es una herramienta específica de **recolección y almacenamiento** de métricas con su propio formato de exposición. La diferencia clave: OTel es la **capa de instrumentación** (cómo medís tu app), Prometheus es la **capa de almacenamiento y consulta** (dónde guardás y consultás esas métricas). Se complementan: OTel puede exportar al formato Prometheus.

### Los 3 pilares de la observabilidad

Los tres pilares son **Métricas**, **Trazas distribuidas** y **Logs**. OpenTelemetry aborda los tres, siendo especialmente fuerte en métricas y trazas distribuidas.

### Métricas RED

| Métrica | Significado | Para qué sirve |
|---------|------------|----------------|
| **Rate** | Requests por segundo | Entender la carga actual del sistema |
| **Errors** | Tasa de errores (4xx/5xx) | Detectar problemas de calidad del servicio |
| **Duration** | Latencia (tiempo de respuesta) | Medir la performance percibida por el usuario |

### ¿Qué es OTLP?

OTLP (OpenTelemetry Protocol) es el protocolo nativo de transmisión de datos de OTel entre componentes (instrumentación → collector → backend). Su ventaja frente a exportar directamente a Prometheus es que desacopla la instrumentación del backend de destino: podés cambiar de Prometheus a Jaeger, Datadog, etc. sin tocar el código de la aplicación. Solo cambiás la configuración del collector.

### Relación OpenTelemetry con Grafana

Grafana actúa como la capa de **visualización**. Puede conectarse a Prometheus (que recibe las métricas de OTel) como datasource y construir dashboards sobre esos datos. También existe el stack Grafana LGTM (Loki, Grafana, Tempo, Mimir) que consume nativamente datos OTel via OTLP.