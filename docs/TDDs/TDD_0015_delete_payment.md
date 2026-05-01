---
id: 0015
estado: Propuesto
autor: Álvaro Marini
fecha: 2026-05-01
titulo: Eliminación (Baja Lógica) de Pagos Existentes
---

# TDD-0006: Eliminación (Baja Lógica) de Pagos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja o anular un registro de pago que fue generado por error o que ya no corresponde cobrar. Para mantener la integridad contable y la inmutabilidad de la base de datos, no se realizará un borrado físico; en su lugar, el registro cambiará de estado.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: "Borrar" un pago que fue cargado con un monto incorrecto o duplicado de forma rápida. Necesita una advertencia antes de anularlo para no cometer equivocaciones, y requiere que quede el registro histórico de que esa cuota fue anulada.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con la anulación.
- El sistema debe validar que el pago exista antes de intentar anularlo.
- El sistema **NO debe realizar un borrado físico** de la base de datos bajo ninguna circunstancia.
- El sistema debe actualizar el atributo `status` a `"Canceled"`.
- El sistema debe impedir la cancelación de un pago que ya se encuentre en estado `"Paid"`.
- Si la anulación es exitosa, la tabla del frontend debe actualizarse automáticamente mostrando el estado cancelado (o filtrándolo de la vista por defecto).

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

A nivel de API REST, la operación de eliminar un recurso se modela con el verbo HTTP `DELETE`, aunque a nivel de infraestructura se traduzca en un `UPDATE` (borrado lógico).

- Endpoint: `DELETE /api/v1/payments/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository`. A diferencia del ABM de socios, **no se implementará el método `delete`**. Se utilizará el método `updateStatus(id, status)` o una especialización `cancel(id)` para evitar que un desarrollador ejecute un borrado físico por error.
2. **Caso de Uso**: `CancelPaymentUseCase` (Comprueba la existencia previa vía `findById`, valida que el estado no sea `Paid` y delega la actualización del estado a `Canceled`).
3. **Adaptador de Salida**: `PostgresPaymentRepository` (Actualización usando el método `update` de Prisma para cambiar el `status`).
4. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El pago no existe"                  | 400 Bad Request           |
| Pago ya abonado (`Paid`)   | Mensaje: "No se puede anular un pago cobrado" | 409 Conflict              |
| Error de conexión a DB     | Mensaje: error del motor de base de datos     | 500 Internal Server Error |
| Anulación exitosa          | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Asegurar que `PaymentRepository` y `PostgresPaymentRepository` expongan un método para cancelar (`updateStatus`), garantizando que no se utilice el método `delete` de Prisma.
2. Crear la lógica de negocio en `CancelPaymentUseCase` con la restricción de estados.
3. Crear el endpoint `DELETE /api/v1/payments/:id` en el `PaymentController` y registrarlo.
4. Añadir el método `delete` (o `cancel`) al servicio Frontend (`payments.ts`).
5. Enlazar el botón de anulación en la vista de pagos, agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada HTTP y actualizar el estado visual de la tabla al recibir el código 204.