# TP Integrador - Actividad 4: Preparando para Producción
**Fase 4:** Verificar y entregar — Trabajo Grupal

---

## 4.1. Verificación técnica

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
| :--- | :--- | :--- | :--- |
| **Tamaño imagen API** | ~1 GB (imagen de desarrollo con devDependencies, tsx, tsc) | 164 MB (content size) | **-84%** |
| **Tamaño imagen Web** | ~570 MB (imagen de desarrollo con Node.js + Vite) | 26.2 MB (content size) | **-95%** |
| **Tiempo de startup API** | ~8s (incluye compilación TypeScript en caliente con tsx + migraciones) | ~3s (JS pre-compilado, sin tsx, sin migraciones) | ~-63% |
| **Memoria API (idle)** | N/A (no medida en desarrollo) | 62.52 MiB / 256 MiB límite (24.42% del límite) | Límite explícito aplicado |
| **Endpoints accesibles** | `curl :3000/api/v1/socios` ✅ | `curl :3000/api/v1/socios` ✅ | Sin regresiones |
| **Frontend vía nginx** | Servido por Vite dev server (Node.js) | `curl localhost/` → 200 OK vía Nginx | Node.js eliminado de la imagen |

---

## 4.2. Verificación de seguridad

| Medida | Estado | Evidencia |
| :--- | :--- | :--- |
| ✅ La API corre con usuario no-root | Verificado | `docker exec alentapp-api whoami` → `node` |
| ✅ No hay `tsc` en la imagen final | Verificado | `docker exec alentapp-api which tsc` → sin output (no encontrado) |
| ✅ No hay herramientas de build en la imagen | Verificado | `npm` presente (incluido en node:alpine base, no removible), `tsc` y `tsx` ausentes |
| ✅ Read-only filesystem activo | Verificado | `docker exec alentapp-api touch /test` falla con "Read-only file system" |
| ✅ Capabilities mínimas | Verificado | `cap_drop: ALL` configurado en compose; `cap_add: NET_BIND_SERVICE` solo en el servicio web |
| ✅ Variables sensibles vía `.env` | Verificado | Credenciales en `.env` local (en `.gitignore`), referenciadas como `${VAR}` en el compose |
| ✅ `no-new-privileges` activo | Verificado | `security_opt: [no-new-privileges:true]` en todos los servicios |
| ⚠️ Healthchecks | Parcialmente | DB: `healthy`. API y Web: `unhealthy` por limitación del healthcheck con `wget` en la imagen base actual; el proceso sí responde correctamente a requests HTTP |

**Nota sobre el healthcheck:** El contenedor de la API responde correctamente a `curl http://localhost:3000/` y a todos los endpoints de negocio. El estado `unhealthy` se debe a que el comando `wget` del healthcheck no puede resolver la URL desde dentro del contexto de ejecución del contenedor bajo las restricciones de `read_only` y `cap_drop: ALL`. El servicio está funcionalmente operativo.

---

## 4.3. Verificación de observabilidad

| Ítem | Estado | Evidencia |
| :--- | :--- | :--- |
| ✅ OpenTelemetry exporta métricas en `:9464/metrics` | Verificado | `curl http://localhost:9464/metrics` devuelve métricas en formato Prometheus |
| ✅ Métricas RED presentes | Verificado | `http_requests_total`, `http_request_duration`, `http_requests_errors_total`, `http_requests_active`, `process_memory_usage` visibles en el endpoint |
| ✅ Métricas de error reflejan 4xx | Verificado | `http_requests_errors_total{route="/api/v1/sports",status="404"} 2` registrado correctamente |
| ✅ Prometheus configurado | Verificado | `observability/prometheus/prometheus.yml` scrapea `:9464` (endpoint OTel) |
| ✅ Grafana con datasource Prometheus | Verificado | Grafana disponible en `http://localhost:3001`, datasource Prometheus configurado |
| ✅ Dashboard RED con 6 paneles | Verificado | Dashboard "RED - Alentapp API" creado con los 6 paneles especificados en la Fase 2 |
| ✅ Gráficos responden al tráfico | Verificado | Métricas actualizadas tras generar requests a los endpoints de la API |

**Muestra de métricas RED capturadas:**
```
http_requests_total{method="GET",route="/api/v1/socios",status="200"} 2
http_requests_total{method="GET",route="/api/v1/lockers",status="200"} 2
http_requests_total{method="GET",route="/api/v1/sports",status="404"} 2
http_requests_errors_total{method="GET",route="/api/v1/sports",status="404"} 2
http_request_duration_sum{route="/api/v1/socios"} 1934ms
process_memory_usage 118231040 bytes (~113 MB RSS)
```

---

## 4.4. Documentación de decisiones

### Arquitectura final

El sistema quedó compuesto por 5 servicios orquestados con `docker-compose.prod.yml`:

```
Internet
    │
    ▼
[Nginx :80]          ← Sirve el frontend React (archivos estáticos)
    │
    ▼
[Fastify API :3000]  ← API REST (Node.js, JS compilado, usuario node)
    │
    ▼
[PostgreSQL :5432]   ← Base de datos (red interna, no expuesta)

[Prometheus :9090]   ← Scraping de métricas desde :9464
    │
    ▼
[Grafana :3001]      ← Visualización de métricas RED
```

Todos los servicios se comunican a través de la red interna `alentapp-network` (bridge). La base de datos no expone puertos al host. Las métricas de OpenTelemetry se exponen en el puerto `9464` separado del tráfico de negocio.

### Decisiones técnicas

**Multi-stage build (API):** Se implementaron 3 stages: `deps` (solo dependencias de producción con `npm ci --omit=dev`), `build` (compilación TypeScript con `tsc`) y `runtime` (imagen final limpia). Esto redujo el tamaño de imagen en un 84%, pasando de ~1 GB a 164 MB. La separación del stage `deps` respecto al `build` maximiza el cache de Docker: si el código fuente cambia pero los `package.json` no, la instalación de dependencias no se re-ejecuta.

**Multi-stage build (Web):** El stage `runtime` usa `nginx:stable-alpine` en lugar de Node.js, eliminando el runtime de Node completamente de la imagen final. Resultado: reducción del 95% (de ~570 MB a 26.2 MB). Nginx está configurado con compresión gzip, headers de seguridad y SPA fallback para React Router.

**Seguridad en el compose:** Se aplicaron `read_only: true`, `cap_drop: ALL`, `security_opt: no-new-privileges:true` y `tmpfs` para directorios que requieren escritura en runtime (`/tmp` en la API, `/var/cache/nginx` y `/var/run` en Nginx). Las credenciales se gestionan a través de un archivo `.env` excluido del control de versiones.

**OpenTelemetry con PrometheusExporter:** Se eligió el patrón de _pull_ (Prometheus hace scraping del endpoint `/metrics`) sobre el patrón de _push_ por mayor resiliencia: si el backend de métricas falla, la aplicación no se ve afectada. El exporter corre en el puerto `9464` separado del puerto de negocio `3000` para no mezclar tráfico operacional con tráfico de observabilidad.

**Hooks globales de Fastify para métricas RED:** En lugar de instrumentar cada controller individualmente, se registraron hooks `onRequest` y `onResponse` en `app.ts` que cubren automáticamente todas las rutas presentes y futuras. Se usa `request.routerPath` en lugar de `request.url` para obtener la ruta parametrizada (e.g., `/api/v1/socios/:id`), evitando la explosión de cardinalidad en Prometheus.

**Reescritura de imports en el Dockerfile (decisión técnica relevante):** El cliente generado de Prisma 7.x usa un campo `exports` en su `package.json` que entra en conflicto con los imports de extensión `.js` generados por TypeScript al compilar a ESM. La solución implementada fue agregar un paso `RUN find packages/api/dist -name "*.js" -exec sed -i 's|generated/client/client.js|generated/client/index.js|g' {} +` en el stage de build del Dockerfile, que reescribe los imports del código compilado para apuntar directamente a `index.js` sin pasar por el campo `exports`. Esta solución permite mantener el código fuente sin modificaciones.

### Problemas encontrados

**Problema principal: Prisma 7.x WASM y ESM/CJS en Node.js.** El desafío más significativo del trabajo fue hacer funcionar la API compilada en un entorno de producción. El cliente de Prisma 7.x genera código que utiliza módulos WASM con carga dinámica ESM, lo cual entra en conflicto con el sistema de módulos del monorepo (que tiene `"type": "module"` en el `package.json` raíz pero compila TypeScript a módulos con `require()`). El problema se manifestaba como `ERR_MODULE_NOT_FOUND` en el resolver ESM al intentar cargar `generated/client/client.js`. La solución final fue reescribir los imports en el JS compilado vía `sed` en el Dockerfile, apuntando a `index.js` directamente.

**Problema secundario: arranque del servidor en ESM.** El patrón `if (process.argv[1].endsWith('app.js'))` usado en `app.ts` para detectar si el módulo es el punto de entrada no funciona correctamente en todos los contextos ESM. La solución fue modificar el chequeo para ser compatible con ESM.

**Problema con `tmpfs` y Nginx.** Con `read_only: true` y `cap_drop: ALL`, Nginx necesita montar como `tmpfs` los directorios `/var/cache/nginx`, `/var/run` y `/tmp` para poder escribir archivos temporales en runtime. Sin esto, el contenedor crasheaba al intentar hacer `chown` en el directorio de caché. Adicionalmente fue necesario agregar `cap_add: NET_BIND_SERVICE` para que Nginx pueda bindear el puerto 80.

### Lecciones aprendidas

- La compatibilidad ESM/CJS en monorepos Node.js con Prisma 7.x requiere atención especial al diseñar el pipeline de build de producción.
- El orden de las instrucciones en un Dockerfile tiene impacto directo en los tiempos de build: copiar primero los manifiestos de dependencias y luego el código fuente maximiza los cache hits.
- `read_only: true` en Docker es una medida de seguridad poderosa pero requiere identificar cuidadosamente todos los directorios que el proceso necesita escribir en runtime.
- Los hooks globales de Fastify son preferibles a la instrumentación manual por controller para métricas de observabilidad: DRY, cobertura automática y uso correcto de `routerPath` para evitar cardinalidad.
