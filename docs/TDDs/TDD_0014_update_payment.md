---
id: 0014
estado: Propuesto
autor: Álvaro Marini
fecha: 2026-05-01
titulo: Actualización de Pagos Existentes
---

# TDD-0005: Actualización de Pagos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir la información de un pago existente en el sistema que se encuentre pendiente (como un error de tipeo en el monto o la fecha de vencimiento), o actualizar su estado manualmente para asentar un cobro o una cancelación.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Modificar datos de los pagos rápidamente desde la tabla del panel de administración. Por ejemplo, corregir el monto de una cuota mal generada, o cambiar el estado de un pago a "Paid" cuando un socio abona en efectivo por ventanilla.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos permitidos del pago (`amount`, `due_date`, `status`).
- El sistema debe validar que un pago cuyo estado actual sea "Paid" o "Canceled" **no pueda ser modificado** (inmutabilidad de registros cerrados).
- El sistema debe validar que, si se modifica el monto, este siga siendo un valor positivo.
- Si el estado se actualiza explícitamente a "Paid", el sistema debe registrar automáticamente la fecha actual en el campo `payment_date`.
- Si la edición es correcta, debe retornar los nuevos datos del pago actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT)[cite: 2].

- Endpoint: `PUT /api/v1/payments/:id`
- Request Body (UpdatePaymentRequest):
```ts
{
    amount?: number;
    due_date?: string; // ISO Date String (YYYY-MM-DD)
    status?: 'Pending' | 'Paid' | 'Canceled';
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `PaymentValidator` (Encargado de verificar que el pago no se encuentre en un estado cerrado antes de permitir la edición, garantizando la inmutabilidad).
3. **Caso de Uso**: `UpdatePaymentUseCase` (Orquesta la validación, asigna el `payment_date` si el status cambia a `Paid`, y llama al repositorio).
4. **Adaptador de Salida**: `PostgresPaymentRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El pago no existe"                  | 404 Not Found             |
| Pago ya cerrado/cobrado    | Mensaje: "No se puede editar un pago cerrado" | 409 Conflict              |
| Monto negativo             | Mensaje: "El monto debe ser mayor a cero"     | 400 Bad Request           |
| Cambio de estado a Paid    | Autocompleta `payment_date` silenciosamente   | 200 OK                    |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdatePaymentRequest`).
2. Ampliar el `PaymentRepository` con el método `update`.
3. Implementar la lógica en `UpdatePaymentUseCase` utilizando el `PaymentValidator` para bloquear ediciones sobre pagos ya procesados o cancelados.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app principal.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación de pagos para permitir la edición.