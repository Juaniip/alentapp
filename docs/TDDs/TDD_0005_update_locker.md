---
id: 0005
estado: Pendiente
autor: Juan Ignacio Wilt
fecha: 2026-05-01
titulo: Modificación de Locker
---

# TDD-0005: Modificación de Locker

## Contexto de Negocio (PRD)

### Objetivo
Permitir la actualización de los datos de un casillero (Locker) existente en el sistema, lo cual incluye cambiar su estado, reubicarlo, editar su número o gestionar la asignación a un socio.

### User Persona
*   **Nombre**: Administrador del Sistema / Personal de Recepción.
*   **Necesidad**: Requiere mantener actualizada la información de los casilleros, ya sea por tareas de mantenimiento, mudanzas dentro del establecimiento, o para asignar/desasignar el casillero a los socios del club.

### Criterios de Aceptación
*   El sistema debe requerir el identificador único (`id`) del casillero que se desea modificar.
*   El sistema debe validar que, en caso de modificar el número (`number`), el nuevo número siga siendo único en el sistema.
*   El sistema debe impedir que un casillero sea asignado a un socio (`member_id` no nulo) si el estado (`status`) actual o resultante de la modificación es "Maintenance".
*   El sistema debe validar que los estados provistos estén dentro de la lista permitida ("Available", "Occupied", "Maintenance").

## Diseño Técnico (RFC)

### Modelo de Datos
La entidad se mantiene sin cambios estructurales, operando sobre los atributos existentes en el esquema definido.
*   `number`: int (Se debe re-validar la restricción Unique si este campo es modificado).
*   `status`: string (Available, Occupied, Maintenance).
*   `location`: string.
*   `member_id`: uuid (Nullable, clave foránea).

### Contrato de API (@alentapp/shared)
Se utilizará el verbo PATCH para permitir modificaciones parciales del recurso.
*   **Endpoint**: `PATCH /api/v1/lockers/:id`
*   **Request Body**:
```ts
{
    "number"?: number,
    "location"?: string,
    "status"?: "Available" | "Occupied" | "Maintenance",
    "member_id"?: string | null
}
```

### Componentes de Arquitectura Hexagonal
*   **Domain**:
    *   Entidad `Locker`.
    *   Implementación de la regla de negocio que verifica: `if (status === 'Maintenance' && member_id != null) throw Error`.
*   **Application**:
    *   Caso de Uso: `UpdateLockerUseCase`.
    *   Puertos de Salida: Uso de `LockerRepository` con los métodos `findById(id)`, `existsByNumber(number)` (solo si el número es parte del payload de actualización), y `update(id, data)`.
*   **Infrastructure**:
    *   Controlador: `UpdateLockerController` para procesar la petición y parámetros.
    *   Adaptador: `PrismaLockerRepository` encargado de ejecutar la actualización en la base de datos (ej. `prisma.locker.update`).

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP actual              |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Casillero inexistente       | Error indicando que no se encontró el recurso solicitado | 404 Not Found             |
| Asignar en mantenimiento    | Error de validación: Un casillero no puede asignarse si su status es "Maintenance" | 422 Unprocessable Entity  |
| Modificar a número duplicado| Error indicando que el número provisto ya pertenece a otro casillero | 409 Conflict              |
| Estado inválido             | Error de validación especificando los estados permitidos | 400 Bad Request           |

## Plan de Implementación
1. Extender los esquemas de validación en `@alentapp/shared` (ej. usando Zod o similares) para el payload parcial (PATCH).
2. Implementar el método `update` en la interfaz del repositorio y en `PrismaLockerRepository`.
3. Desarrollar el `UpdateLockerUseCase`, inyectando las lógicas de dominio que impiden asignar socios a casilleros en mantenimiento.
4. Crear el controlador `UpdateLockerController` para recibir la petición PATCH y manejar las respuestas.
5. Registrar la nueva ruta de modificación en la capa de red del backend.
