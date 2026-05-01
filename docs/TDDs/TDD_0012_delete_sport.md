---
id: 0012
estado: Propuesto
autor: Sergio Adrián Maldonado
fecha: 2026-05-01
titulo: Eliminación de Deportes Existentes
---

# TDD-0012: Eliminación de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente un deporte del catálogo, eliminando su registro de la base de datos cuando el club deja de ofrecer esa disciplina o cuando se cargó por error. La eliminación debe ser segura: no debe permitirse eliminar un deporte que tenga inscripciones activas asociadas, para preservar la integridad referencial y la trazabilidad de los socios.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Borrar un deporte que fue cargado por error o que el club ya no ofrece, de forma rápida desde la misma tabla principal. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables, y un mensaje claro en caso de que el sistema rechace la eliminación por tener inscripciones vinculadas.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el deporte exista antes de intentar borrarlo.
- El sistema debe validar que el deporte no tenga inscripciones activas (`Enrollment.isActive = true`) asociadas. Si las tiene, debe rechazar la operación.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/deportes/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `SportRepository` (Métodos `findById`, `hasActiveEnrollments` y `delete`).
2. **Caso de Uso**: `DeleteSportUseCase` (Comprueba existencia previa vía `findById`, valida ausencia de inscripciones activas, y delega la eliminación).
3. **Adaptador de Salida**: `PostgresSportRepository` (Eliminación usando el método `delete` de Prisma; consulta de inscripciones activas vía relación con `Enrollment`).
4. **Adaptador de Entrada**: `SportController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                                      | Resultado Esperado                                                  | Código HTTP actual        |
| ---------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| Deporte inexistente                            | Mensaje: "El deporte no existe"                                     | 400 Bad Request           |
| Deporte con inscripciones activas              | Mensaje: "No se puede eliminar un deporte con inscripciones activas"| 409 Conflict              |
| Error de conexión a DB                         | Mensaje: error del motor de base de datos                           | 400 Bad Request           |
| Eliminación exitosa                            | Respuesta vacía                                                     | 204 No Content            |

## Plan de Implementación

1. Ampliar el `SportRepository` y `PostgresSportRepository` con los métodos `delete` y `hasActiveEnrollments`.
2. Crear la lógica de negocio en `DeleteSportUseCase` (verificación de existencia + chequeo de inscripciones activas).
3. Crear el endpoint `DELETE /api/v1/deportes/:id` en el `SportController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`sports.ts`).
5. Enlazar el botón de eliminación en `SportsView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
