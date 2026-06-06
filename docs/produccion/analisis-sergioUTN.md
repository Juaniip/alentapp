# Análisis de infraestructura Docker — Actividad 4 Fase 1

**Alumno:** Sergio Adrián Maldonado  
**Usuario:** sergioUTN  
**Fecha:** 06/06/2026

---

## 1.1. Análisis de la infraestructura Docker actual

### Problemas identificados

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|---|---|---|
| Credenciales hardcodeadas en texto plano | `docker-compose.yml`:6-8 y :30 | Alto | Mover a archivo `.env` y referenciar con `${VAR}`. Agregar `.env.example` sin valores reales. |
| `prisma migrate dev` en producción | `docker-compose.yml`:36 | Alto | Reemplazar por `prisma migrate deploy`, que aplica migraciones sin generar ni resetear el schema. |
| Contenedores corren como root | `packages/api/Dockerfile` y `packages/web/Dockerfile` — sin instrucción `USER` | Alto | Crear usuario sin privilegios con `adduser` y ejecutar la app con `USER appuser`. |
| Sin multi-stage build: devDependencies en imagen final | `packages/api/Dockerfile`:12 y `packages/web/Dockerfile`:8 — `RUN npm install` sin `--omit=dev` | Medio | Implementar multi-stage build: etapa de build con todas las deps, etapa runtime solo con JS compilado y deps de producción. El web debe servirse con nginx, no con el servidor de Vite. |
| Puerto de base de datos expuesto al host y sin red interna | `docker-compose.yml`:10 — `'5432:5432'`; ausencia de sección `networks` | Alto | Eliminar el mapeo de puerto de la DB. Definir red interna personalizada para que la BD sea accesible solo desde los servicios internos. |

---

### Detalle de cada problema

#### Problema 1 — Credenciales hardcodeadas en texto plano

**Dónde:** `docker-compose.yml` líneas 6-8 y 30

```yaml
POSTGRES_USER: admin
POSTGRES_PASSWORD: password123
DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db
```

El archivo `docker-compose.yml` está commiteado en el repositorio. Cualquier persona con acceso puede ver usuario y contraseña de la base de datos. En producción, las credenciales deben vivir en variables de entorno inyectadas en el servidor, nunca en el código fuente.

**Solución:**
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
DATABASE_URL: ${DATABASE_URL}
```
Acompañado de un archivo `.env` (en `.gitignore`) y un `.env.example` como plantilla.

---

#### Problema 2 — `prisma migrate dev` en producción

**Dónde:** `docker-compose.yml` línea 36

```yaml
npx prisma migrate dev --name init
```

`migrate dev` es un comando de desarrollo que puede generar nuevas migraciones automáticamente o resetear el schema si detecta inconsistencias, destruyendo datos reales de usuarios.

**Solución:**
```yaml
npx prisma migrate deploy
```
`migrate deploy` solo aplica migraciones ya existentes de forma controlada, sin generar ni resetear nada.

---

#### Problema 3 — Contenedores corren como root

**Dónde:** `packages/api/Dockerfile` y `packages/web/Dockerfile` — ninguno define instrucción `USER`.

Por defecto, los procesos dentro de un contenedor Docker corren como `root`. Si un atacante explota una vulnerabilidad en la app y ejecuta código arbitrario, tiene acceso root dentro del contenedor, pudiendo escalar privilegios hacia el host.

**Solución:** agregar en el stage runtime, antes del `CMD`:
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

---

#### Problema 4 — Sin multi-stage build: devDependencies en imagen final

**Dónde:** `packages/api/Dockerfile` línea 12 y `packages/web/Dockerfile` línea 8.

```dockerfile
RUN npm install  # instala TODO: TypeScript, tsx, jest, etc.
```

Sin multi-stage build, la imagen final incluye todas las herramientas de desarrollo. Consecuencias:
- La imagen API pesa ~1GB cuando podría pesar ~300MB (reducción ≥70% posible).
- La imagen contiene `tsc`, `tsx`, `jest`, que no se necesitan en producción y amplían la superficie de ataque.
- El frontend se sirve con el servidor de desarrollo Vite, que no tiene compresión, caché de assets ni headers de seguridad.

**Solución:** multi-stage build con tres etapas (deps → build → runtime). La etapa runtime solo recibe el JS compilado y las dependencias de producción:
```dockerfile
# Stage runtime: imagen limpia
FROM node:22-alpine AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules  # solo prod deps
```
Para el frontend, la etapa runtime usa `nginx:stable-alpine` para servir los archivos estáticos generados por `vite build`.

---

#### Problema 5 — Puerto de base de datos expuesto al host y sin red interna

**Dónde:** `docker-compose.yml` línea 10 y ausencia de sección `networks`.

```yaml
ports:
  - '5432:5432'
```

El mapeo `5432:5432` hace que la BD sea accesible directamente desde el host. En un servidor con IP pública, la BD queda expuesta a internet. Adicionalmente, todos los servicios comparten la red `bridge` por defecto sin aislamiento.

**Solución:**
```yaml
services:
  db:
    # sin ports — la DB no necesita salida al host
    networks:
      - alentapp-network
  api:
    networks:
      - alentapp-network

networks:
  alentapp-network:
    driver: bridge
```

---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry** es un framework de observabilidad open source y vendor-neutral. Provee SDKs y APIs para que las aplicaciones **generen, recolecten y exporten** datos de telemetría (métricas, logs y trazas). Es agnóstico al backend: puede exportar a Prometheus, Datadog, Grafana Cloud, Jaeger, etc.

**Prometheus** es un sistema de monitoreo y base de datos de series temporales. Su función es **almacenar y consultar** métricas. Scrapea endpoints HTTP en su propio formato a intervalos regulares.

| | OpenTelemetry | Prometheus |
|---|---|---|
| Rol | Genera y exporta telemetría | Almacena y consulta métricas |
| Alcance | Métricas + Logs + Trazas | Solo métricas |
| Vendor | Neutro (exporta a cualquier backend) | Específico (formato propio) |

En la práctica se usan juntos: OpenTelemetry instrumenta la app → Prometheus almacena → Grafana visualiza.

---

### Los "3 pilares" de la observabilidad

La observabilidad se basa en tres tipos de datos complementarios:

1. **Logs** — registro textual de eventos. Responden a _"¿qué pasó exactamente?"_. Ejemplo: `ERROR: conexión a DB rechazada a las 10:32`.

2. **Métricas** — valores numéricos agregados en el tiempo. Responden a _"¿cuánto y con qué frecuencia?"_. Ejemplo: `requests_por_segundo = 42`, `error_rate = 2.3%`.

3. **Trazas (Traces)** — seguimiento del camino completo de una request a través de servicios. Responden a _"¿dónde se tardó?"_. Ejemplo: una request pasa por API → auth → DB y la traza muestra la duración de cada salto.

**OpenTelemetry aborda los 3 pilares** desde un único SDK, aunque en esta actividad el foco está en métricas.

---

### Métricas RED (Rate, Errors, Duration)

El método RED (Tom Wilkie, Grafana Labs) define tres métricas esenciales para monitorear servicios orientados a requests:

| Métrica | Qué mide | Para qué sirve |
|---|---|---|
| **Rate** | Requests por segundo que recibe el servicio | Detectar picos de tráfico o caída de demanda |
| **Errors** | Porcentaje de requests fallidas (4xx/5xx) | Detectar problemas antes de que los usuarios los reporten |
| **Duration** | Latencia de respuesta (tiempo que tarda el servicio) | Identificar degradación de performance y cuellos de botella |

Juntas responden: **¿el servicio está funcionando bien ahora mismo?**

---

### ¿Qué es OTLP y qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el protocolo estándar de OpenTelemetry para transmitir telemetría entre componentes. Define un formato binario eficiente (sobre gRPC o HTTP) para enviar métricas, logs y trazas desde la app hacia un collector o backend.

**Ventaja sobre exportar directo a Prometheus:**

Con OTLP, la aplicación no sabe ni le importa qué sistema va a consumir los datos. Es como hablar un idioma universal: si mañana se quiere cambiar de Prometheus a Datadog o Grafana Cloud, solo se modifica la configuración del exportador, sin tocar el código de la app. Con exportación directa a Prometheus en cambio, el código queda atado al formato específico de Prometheus, y cambiar de sistema implica reescribir la instrumentación.

| | OTLP | Export directo a Prometheus |
|---|---|---|
| Acoplamiento | Neutro — la app no conoce el backend | Acoplado al formato Prometheus |
| Flexibilidad | Un SDK, múltiples backends | Cambiar backend implica cambiar código |
| Datos | Métricas + Logs + Trazas | Solo métricas |

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana es una herramienta de **visualización**: no almacena datos propios, se conecta a datasources (Prometheus, Loki, etc.) y construye dashboards con queries.

La arquitectura en esta actividad:

```
App Node.js
  └─ OpenTelemetry SDK
       └─ PrometheusExporter → expone /metrics en :9464
                                    ↑
                              Prometheus scrapea cada 15s
                                    ↓
                              Prometheus almacena series temporales
                                    ↑
                              Grafana consulta con PromQL
                                    ↓
                              Grafana renderiza el dashboard RED
```

Grafana Labs (empresa detrás de Grafana) también desarrolla stacks que reciben OTLP directamente sin Prometheus como intermediario, pero en esta actividad el flujo es: OTel genera → Prometheus almacena → Grafana visualiza.
