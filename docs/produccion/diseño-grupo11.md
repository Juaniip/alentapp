# Diseño de Infraestructura y Observabilidad para Producción
**Fase 2 - Trabajo Grupal - Grupo 11**

## 2.1. Diseño de la infraestructura Docker

### a) `packages/api/Dockerfile.prod`

**Propósito:** Construir una imagen mínima y segura de la API para producción. Elimina todas las herramientas de desarrollo (TypeScript, tsx, devDependencies) y ejecuta únicamente el código JavaScript compilado con un usuario sin privilegios.

**Estructura (3 etapas):**

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `deps` | `node:22-alpine` | Instalar exclusivamente las dependencias de producción utilizando `npm ci --omit=dev`, aprovechando el cache de capas de Docker. |
| **Stage 2** | `build` | `node:22-alpine` | Instalar todas las dependencias (incluyendo dev), agregar `typescript` como devDependency y compilar el código TypeScript a JavaScript nativo con `tsc`, generando el directorio `dist/`. |
| **Stage 3** | `runtime` | `node:22-alpine` | Imagen final limpia: recibe el `dist/` compilado, el cliente generado de Prisma y los `node_modules` de producción del Stage 1. Corre con usuario `node` (no-root). |

**Requisitos no funcionales:**
- Tamaño máximo de imagen final: ~300 MB (reducción ≥ 70% respecto a la imagen de desarrollo ~1 GB)
- Usuario no-root: `node` (UID 1000), incluido en la imagen base. Aplicar `chown -R node:node /app` antes del cambio de usuario.
- Healthcheck contra la ruta `/` (que ya existe en `app.ts` y responde 200 sin requerir DB): `CMD wget -qO- http://localhost:3000/ || exit 1` con `interval: 30s`, `timeout: 5s`, `retries: 3`
- `.dockerignore` debe excluir: `node_modules`, `.git`, `dist`, `*.md`, `docker-compose*.yml`, `observability/`
- No debe contener `tsc`, `tsx` ni ninguna herramienta de build en la imagen final (verificable con `which tsc`)
- El `package.json` de la API requiere agregar `typescript` en `devDependencies` y un script `"build": "tsc"` para que el Stage 2 funcione
- Tiempo de startup estimado: < 5 segundos

**Pseudocódigo de la estructura:**
```
# Stage 1: deps (solo producción)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json + package.json de api y shared
RUN npm ci --omit=dev

# Stage 2: build (compilación)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json de todos los workspaces
RUN npm ci                           # incluye devDependencies (tsc, tsx, etc.)
COPY . .
RUN npx prisma generate --config packages/api/prisma.config.ts
RUN npm run build -w packages/api    # ejecuta tsc → genera packages/api/dist/

# Stage 3: runtime (imagen final)
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
# El cliente de Prisma se genera en src/generated/client (definido en schema.prisma)
# y debe copiarse ya que no forma parte de node_modules estándar
COPY --from=build /app/packages/api/src/generated ./packages/api/src/generated
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "packages/api/dist/app.js"]
```

> **Nota sobre Prisma:** El schema define `output: "../src/generated/client"`, lo que significa que el cliente generado queda dentro de `src/` y no en `node_modules`. Por eso es necesario copiarlo explícitamente al Stage `runtime`; de lo contrario, la API no encontraría el cliente de base de datos al arrancar.

> **Nota sobre el script de build:** El `package.json` actual de la API no tiene el script `build` ni `typescript` como devDependency. Ambos deben agregarse antes de implementar el Dockerfile.prod: `"build": "tsc -p tsconfig.json"` y `"typescript": "^5.x"` en devDependencies. El `tsconfig` de la API también debe definir `"outDir": "dist"` y `"rootDir": "src"`.

---

### b) `packages/web/Dockerfile.prod`

**Propósito:** Compilar el frontend con Vite y servirlo con Nginx. Elimina Node.js completamente de la imagen final, reduciendo drásticamente el tamaño y la superficie de ataque.

**Estructura (3 etapas):**

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `deps` | `node:22-alpine` | Instalar las dependencias necesarias para la construcción de los workspaces `web` y `shared`. |
| **Stage 2** | `build` | `node:22-alpine` | Ejecutar el empaquetador (`vite build`) para generar los assets estáticos minimizados en `dist/`. |
| **Stage 3** | `runtime` | `nginx:stable-alpine` | Servir los archivos estáticos desde `/usr/share/nginx/html`. Node.js no está presente en esta imagen. |

**Requisitos no funcionales:**
- Tamaño máximo de imagen final: ~50 MB (reducción ≥ 70% respecto a la imagen de desarrollo ~570 MB)
- Nginx configurado con: compresión gzip para assets JS/CSS, headers de cache para archivos estáticos (`Cache-Control: max-age=31536000` para assets con hash), y security headers (`X-Frame-Options`, `X-Content-Type-Options`)
- Configuración SPA: todas las rutas no encontradas deben redirigir a `index.html` mediante `try_files $uri $uri/ /index.html`
- Healthcheck: `CMD wget -qO- http://localhost:80 || exit 1` con `interval: 30s`, `timeout: 5s`, `retries: 3`
- No debe contener Node.js ni npm en la imagen final

**Pseudocódigo de la estructura:**
```
# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json + package.json de web y shared
RUN npm ci

# Stage 2: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w packages/web   # genera packages/web/dist/

# Stage 3: runtime (solo Nginx, sin Node.js)
FROM nginx:stable-alpine AS runtime
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

**Estructura de `nginx.conf`:**
```nginx
server {
    listen 80;

    # Compresión gzip
    gzip on;
    gzip_types text/css application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # Cache de assets con hash (immutable)
    location ~* \.(js|css|png|jpg|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

> **Nota sobre `tmpfs` en Nginx:** Al activar `read_only: true` en el compose de producción, Nginx necesita escribir en `/var/cache/nginx`, `/var/run` y `/tmp` en tiempo de ejecución. Estos directorios deben montarse como `tmpfs` (memoria RAM temporal) para que el proceso funcione sin un filesystem escribible persistente.

---

### c) `docker-compose.prod.yml`

**Propósito:** Orquestar los tres servicios (api, web, db) para el entorno productivo, incorporando todas las medidas de seguridad, restricción de recursos, logging estructurado y gestión de secretos ausentes en el compose de desarrollo.

| Aspecto | Requisito | Decisión de diseño |
| :--- | :--- | :--- |
| **Resource limits** | CPU y memoria definidos por servicio | `api`: 0.5 CPU / 256 MB. `web`: 0.25 CPU / 64 MB. `db`: 0.5 CPU / 512 MB |
| **Healthchecks** | API y DB | `db`: `pg_isready`. `api`: HTTP GET a `/` (ruta existente, no requiere DB). `web`: HTTP GET a `/` |
| **Seguridad** | `read_only`, `cap_drop`, `no-new-privileges` | `read_only: true` en api y web. `cap_drop: [ALL]`. `cap_add: [NET_BIND_SERVICE]` solo en web (puerto 80). `security_opt: [no-new-privileges:true]`. `tmpfs: [/tmp]` en api para escritura temporal |
| **Logging** | Driver json-file con rotación | `driver: json-file` con `max-size: 10m` y `max-file: 3` en todos los servicios |
| **Red** | Red interna personalizada | Red `alentapp-network` de tipo `bridge` definida explícitamente. Los servicios no exponen puertos innecesariamente entre sí |
| **Secrets** | Variables sensibles desde `.env` | Todas las credenciales referenciadas con `${VAR}`. Archivo `.env` en `.gitignore`. En producción real, reemplazar por Docker Secrets |

**Pseudocódigo de la estructura:**
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes: [pgdata:/var/lib/postgresql/data]
    networks: [alentapp-network]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s / timeout: 5s / retries: 5
    logging:
      driver: json-file / max-size: 10m / max-file: 3
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 512M }

  api:
    build: { context: ., dockerfile: packages/api/Dockerfile.prod }
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    ports: ['3000:3000', '9464:9464']   # 9464 para métricas OTel → Prometheus
    networks: [alentapp-network]
    depends_on: { db: { condition: service_healthy } }
    read_only: true
    tmpfs: [/tmp]
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s / timeout: 5s / retries: 3
    logging:
      driver: json-file / max-size: 10m / max-file: 3
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 256M }

  web:
    build: { context: ., dockerfile: packages/web/Dockerfile.prod }
    ports: ['80:80']
    networks: [alentapp-network]
    depends_on: [api]
    read_only: true
    tmpfs: [/tmp, /var/cache/nginx, /var/run]
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: [no-new-privileges:true]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:80"]
      interval: 30s / timeout: 5s / retries: 3
    logging:
      driver: json-file / max-size: 10m / max-file: 3
    deploy:
      resources:
        limits: { cpus: '0.25', memory: 64M }

networks:
  alentapp-network:
    driver: bridge

volumes:
  pgdata:
```

> **Nota sobre el puerto 9464:** La API expone este puerto exclusivamente para que Prometheus pueda hacer scraping de las métricas de OpenTelemetry. No forma parte del tráfico de negocio.

---

## 2.2. Diseño de la observabilidad

### a) Métricas RED a capturar

| Métrica | Nombre en código | Tipo OpenTelemetry | Descripción | Labels |
| :--- | :--- | :--- | :--- | :--- |
| **Rate** | `http.requests.total` | `Counter` | Total acumulado de requests HTTP recibidos. La tasa por segundo se deriva en Prometheus con `rate(...[1m])` | `method`, `route`, `status` |
| **Errors** | `http.requests.errors` | `Counter` | Total de requests que resultaron en errores 4xx o 5xx. Permite calcular el porcentaje de error sobre el total | `method`, `route`, `status` |
| **Duration** | `http.request.duration` | `Histogram` | Latencia de cada request en milisegundos. Se analiza mediante percentiles p95 y p99 con `histogram_quantile()` | `method`, `route` |
| **Memoria del proceso** | `process.memory.usage` | `ObservableGauge` | Memoria RSS del proceso Node.js en bytes. Se evalúa en cada scrape de Prometheus mediante callback | — |
| **Requests activos** | `http.requests.active` | `UpDownCounter` | Cantidad de requests siendo procesados concurrentemente en un instante dado | — |

**Criterio de registro de errores:** se incrementa `http.requests.errors` cuando el código de estado HTTP de la respuesta es `>= 400`. Los errores 4xx y 5xx se diferencian mediante el label `status`.

---

### b) Configuración del OpenTelemetry SDK

El SDK se inicializa en un archivo dedicado `packages/api/src/infrastructure/telemetry.ts` que **debe ser importado como primer statement en `app.ts`**, antes de cualquier otro módulo. Esto es un requisito técnico de OpenTelemetry: el monkey-patching de las librerías (Fastify, HTTP) debe ocurrir antes de que sean importadas.

Las métricas RED se registran mediante **Fastify hooks globales** (`onRequest` y `onResponse`) definidos en `app.ts`, en lugar de instrumentar cada controller individualmente. Esto centraliza la lógica de observabilidad en un único lugar y garantiza cobertura automática de todas las rutas presentes y futuras.

**Decisiones de diseño del SDK:**

| Decisión | Elección | Justificación |
| :--- | :--- | :--- |
| **Exporter** | `PrometheusExporter` | Expone las métricas en formato Prometheus en `:9464/metrics`. Prometheus hace scraping (pull) en lugar de que la app empuje (push), lo cual es más resiliente |
| **Puerto métricas** | `9464` | Puerto estándar de OTel para Prometheus. Separado del puerto de la API (`3000`) para no mezclar tráfico de métricas con tráfico de negocio |
| **Auto-instrumentaciones** | `getNodeAutoInstrumentations` con HTTP y Fastify | Captura automáticamente el ciclo de vida de cada request sin modificar los handlers, reduciendo el boilerplate |
| **Métricas manuales RED** | Fastify hooks globales en `app.ts` | Dado que todos los controllers siguen el mismo patrón, centralizar la instrumentación en hooks de `onRequest`/`onResponse` evita duplicar código en los 5 controllers y garantiza cobertura total |
| **Nombre del Meter** | `alentapp-api` | Prefijo que aparece en los nombres de las métricas exportadas, permitiendo filtrar en Prometheus por servicio |

**Estructura conceptual del archivo `telemetry.ts`:**

```typescript
// PRIMERO: este archivo debe importarse antes que cualquier otro en app.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';

// 1. Configurar el exporter de Prometheus en puerto 9464
const prometheusExporter = new PrometheusExporter({ port: 9464, endpoint: '/metrics' });

// 2. Inicializar el SDK con auto-instrumentaciones para HTTP y Fastify
const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fastify': { enabled: true },
    }),
  ],
});

sdk.start();

// 3. Crear el Meter con el nombre del servicio
const meter = metrics.getMeter('alentapp-api');

// 4. Definir las métricas RED y las adicionales
export const redMetrics = {
  requestCounter:  meter.createCounter('http.requests.total',
                     { description: 'Total de requests HTTP' }),
  errorCounter:    meter.createCounter('http.requests.errors',
                     { description: 'Total de errores HTTP (4xx/5xx)' }),
  requestDuration: meter.createHistogram('http.request.duration',
                     { description: 'Latencia de requests en ms', unit: 'ms' }),
  activeRequests:  meter.createUpDownCounter('http.requests.active',
                     { description: 'Requests concurrentes activos' }),
};

// 5. ObservableGauge: se evalúa automáticamente en cada scrape de Prometheus
const memoryGauge = meter.createObservableGauge('process.memory.usage',
  { description: 'Memoria RSS del proceso Node.js', unit: 'bytes' });

memoryGauge.addCallback((result) => {
  result.observe(process.memoryUsage().rss);
});

export { sdk };
```

**Integración en `app.ts` mediante hooks globales de Fastify:**

```typescript
// app.ts — luego de registrar todas las rutas
import { redMetrics } from './infrastructure/telemetry.js';

// Hook global onRequest: se ejecuta al inicio de cada request
server.addHook('onRequest', (request, _reply, done) => {
  request.startTime = Date.now();
  const route  = request.routerPath ?? request.url.split('?')[0];
  const method = request.method;
  redMetrics.activeRequests.add(1, { method, route });
  done();
});

// Hook global onResponse: se ejecuta al finalizar cada request
server.addHook('onResponse', (request, reply, done) => {
  const route    = request.routerPath ?? request.url.split('?')[0];
  const method   = request.method;
  const status   = String(reply.statusCode);
  const duration = Date.now() - (request.startTime ?? Date.now());

  redMetrics.requestCounter.add(1, { method, route, status });
  redMetrics.requestDuration.record(duration, { method, route });
  redMetrics.activeRequests.add(-1, { method, route });

  if (reply.statusCode >= 400) {
    redMetrics.errorCounter.add(1, { method, route, status });
  }
  done();
});
```

> **Ventaja del enfoque por hooks:** Fastify expone `request.routerPath` en el hook `onResponse`, que contiene la ruta parametrizada (ej. `/api/v1/socios/:id`) en lugar de la URL real (ej. `/api/v1/socios/abc-123`). Esto agrupa correctamente las métricas por endpoint en Prometheus, evitando la explosión de cardinalidad que ocurriría si se usara la URL cruda.

---

### c) Dashboard RED en Grafana

El dashboard se llamará **"AlentApp - Métricas RED"** y contendrá 6 paneles organizados de lo macro (tráfico general) a lo micro (cuellos de botella por endpoint).

| # | Panel | Métrica base | Tipo de gráfico | Propósito | Query PromQL de referencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Requests por segundo** | `http_requests_total` | Time series | Visualizar el volumen de tráfico actual y detectar picos o caídas inesperadas | `rate(http_requests_total[1m])` |
| 2 | **Tasa de error** | `http_requests_errors_total` / `http_requests_total` | Time series | Porcentaje de requests fallidos sobre el total | `rate(http_requests_errors_total[1m]) / rate(http_requests_total[1m]) * 100` |
| 3 | **Latencia p95/p99** | `http_request_duration` | Time series | Latencia percibida por el 95% y 99% de los usuarios. Detecta degradación antes que el promedio | `histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))` |
| 4 | **Por status code** | `http_requests_total` | Stacked area | Distribución de respuestas 2xx, 4xx y 5xx. Distingue errores de cliente vs. servidor | `sum by(status) (rate(http_requests_total[1m]))` |
| 5 | **Memoria del proceso** | `process_memory_usage` | Time series | Consumo de memoria RSS del proceso Node.js. Detecta memory leaks progresivos | `process_memory_usage` |
| 6 | **Endpoints más lentos** | `http_request_duration` | Bar chart horizontal | Top 5 de rutas con mayor latencia promedio. Identifica cuellos de botella | `topk(5, avg by(route) (rate(http_request_duration_sum[5m]) / rate(http_request_duration_count[5m])))` |

**Organización visual del dashboard:**
- **Fila 1:** Paneles 1 y 2 — visión global del estado del sistema (tráfico y errores)
- **Fila 2:** Panel 3 — performance percibida por el usuario (latencia)
- **Fila 3:** Paneles 4 y 5 — detalle operativo (distribución de status codes y memoria)
- **Fila 4:** Panel 6 — diagnóstico de cuellos de botella por endpoint
