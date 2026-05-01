---
id: 0009
estado: Pendiente
autor: Valentino Chiappini
fecha: 2026-05-01
titulo: Eliminación de Préstamo de Equipamiento
---

# TDD-0009: Eliminación de Préstamo de Equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos eliminar un préstamo que fue registrado por error, manteniendo la integridad del historial de préstamos del club. El sistema no permite borrado físico de préstamos válidos; esta operación está reservada exclusivamente para corrección de datos mal ingresados.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Borrar un préstamo que fue cargado por error (socio equivocado, ítem duplicado) antes de que tenga movimiento real. Necesita una advertencia antes de confirmar para evitar borrados accidentales irreparables.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el préstamo exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico del registro (`hard delete`).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente sin recargar la página.

## Diseño Técnico (RFC)

### Contrato de API (`@alentapp/shared`)

Al tratarse de una operación que solo requiere el identificador del préstamo, no se envía cuerpo en la petición.

- **Endpoint**: `DELETE /api/v1/equipment-loans/:id`
- **Request Body**: `None`
- **Response**: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

- **Domain**: Sin reglas de negocio adicionales para esta operación. La única restricción es que el préstamo debe existir.
- **Application**: Caso de uso `DeleteEquipmentLoanUseCase`. Orquesta: buscar el préstamo por `id` vía `findById`, lanzar excepción si no existe, delegar el borrado al repositorio. Puerto de salida `IEquipmentLoanRepository` (métodos `findById`, `delete`).
- **Infrastructure**: `PrismaEquipmentLoanRepository` implementando `delete` usando `prisma.equipmentLoan.delete`. Controlador `EquipmentLoanController` con la ruta `DELETE` que extrae el `id` y retorna `204 No Content`.

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Préstamo inexistente       | Mensaje: "El préstamo no existe."             | 404 Not Found             |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde."| 500 Internal Server Error |

## Plan de Implementación

1. Ampliar el puerto `IEquipmentLoanRepository` con el método `delete`.
2. Implementar `DeleteEquipmentLoanUseCase` en la capa de Application.
3. Ampliar `PrismaEquipmentLoanRepository` con el método `delete`.
4. Crear la ruta `DELETE /api/v1/equipment-loans/:id` en `EquipmentLoanController` y registrarla en `app.ts`.
5. Añadir el método `delete` al servicio del Frontend (`equipmentLoans.ts`).
6. Enlazar el botón de eliminación en la vista correspondiente agregando `window.confirm` antes de ejecutar la llamada.