---
id: 0006
estado: Pendiente
autor: Juan Ignacio Wilt
fecha: 2026-05-01
titulo: Baja de Locker
---

# TDD-0006: Baja de Locker

## Contexto de Negocio (PRD)

### Objetivo
Permitir la eliminación (baja) de un casillero (Locker) del sistema, posibilitando que la administración mantenga el inventario digital actualizado cuando un casillero es retirado físicamente, desmantelado o deja de existir en las instalaciones del club.

### User Persona
*   **Nombre**: Administrador del Sistema / Personal de Mantenimiento.
*   **Necesidad**: Necesita dar de baja casilleros que ya no se encuentran físicamente en el club para evitar que se sigan listando y, por error, sean asignados a los socios.

### Criterios de Aceptación
*   El sistema debe requerir el identificador único (`id`) del casillero a eliminar.
*   El sistema debe impedir la eliminación de un casillero si su estado actual es "Occupied" (es decir, si tiene un `member_id` asignado), previniendo inconsistencias en los servicios que se brindan a los socios.
*   Si el casillero no existe en la base de datos, el sistema debe informar que el recurso no fue encontrado.
*   Al finalizar, el sistema debe remover el registro y retornar una confirmación de la operación.

## Diseño Técnico (RFC)

### Modelo de Datos
No se requieren cambios estructurales en Prisma ni en la entidad. Se trabajará sobre la entidad `Locker` existente.
*   Se utilizará el campo `id` de tipo `uuid` (Primary Key) para ubicar el registro.
*   Se validará el campo `status` y el campo `member_id` previo a la ejecución del borrado.

### Contrato de API (@alentapp/shared)
*   **Endpoint**: `DELETE /api/v1/lockers/:id`
*   **Request Body**:
```ts
{
    // El cuerpo de la petición va vacío, el parámetro viaja en la URL
}
```

### Componentes de Arquitectura Hexagonal
*   **Domain**: Entidad `Locker`. Implementación de lógica de dominio para evaluar si el casillero puede ser eliminado (ej. `canBeDeleted()`, el cual devuelve falso si el `status` es "Occupied").
*   **Application**: Creación del caso de uso `DeleteLockerUseCase`. Consumirá el puerto de salida `LockerRepository` a través de los métodos `findById(id: string)` y `delete(id: string)`.
*   **Infrastructure**:
    *   Controlador: `DeleteLockerController` encargado de parsear el `id` de los parámetros de la URL y mapear los errores a códigos HTTP.
    *   Adaptador: Implementación del método de borrado físico en `PrismaLockerRepository`.

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP actual              |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Casillero inexistente       | Error indicando que el casillero con el ID provisto no existe | 404 Not Found             |
| Casillero en uso ("Occupied") | Error de validación indicando que no se puede borrar un casillero actualmente asignado a un socio | 409 Conflict / 422 Unprocessable Entity |
| ID con formato inválido     | Error de validación indicando que el ID no es un UUID válido | 400 Bad Request           |

## Plan de Implementación
1. Actualizar el contrato en `@alentapp/shared` agregando los tipos de respuesta esperados para la operación de eliminación.
2. Implementar el método `findById` y `delete` en la interfaz del repositorio y en `PrismaLockerRepository`.
3. Desarrollar el servicio `DeleteLockerUseCase` incorporando la validación del estado del casillero antes de ordenar su eliminación.
4. Crear el controlador `DeleteLockerController` e inyectar el caso de uso correspondiente.
5. Registrar la ruta `DELETE /lockers/:id` en el enrutador de la aplicación.
