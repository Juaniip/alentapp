---
id: 0008
estado: Pendiente
autor: Valentino Chiappini
fecha: 2026-05-01
titulo: Actualización de Préstamo de Equipamiento
---

# TDD-0008: Actualización de Préstamo de Equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos actualizar los datos de un préstamo existente, principalmente para registrar la devolución del material (`Returned`) o reportar que fue devuelto con daños (`Damaged`), y también para corregir el nombre del ítem o extender la fecha de devolución si fuera necesario.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cuando un socio devuelve el equipamiento, Alberto necesita cerrar ese préstamo rápidamente desde el panel. Si el material llegó roto, debe poder marcarlo como dañado. No debería poder modificar a quién pertenece el préstamo ni cuándo se realizó.

### Criterios de Aceptación

- El sistema debe permitir actualizar `itemName`, `status` y `dueDate` de forma parcial.
- El sistema debe rechazar cualquier intento de modificar `memberId` o `loanDate`, ya que son campos inmutables.
- El `status` solo puede cambiar a `Returned` o `Damaged`; no puede volver a `Loaned`.
- Si se modifica `dueDate`, debe seguir siendo estrictamente posterior a la `loanDate` original.
- Si la actualización es correcta, debe retornar el objeto del préstamo con los datos actualizados.

## Diseño Técnico (RFC)

### Contrato de API (`@alentapp/shared`)

Se utilizará una actualización parcial. Solo se permiten los campos modificables.

- **Request Body**:

```ts
{
  itemName?: string;              // Opcional. No puede estar vacío si se envía.
  status?: 'Returned' | 'Damaged'; // No se acepta 'Loaned'.
  dueDate?: string;               // ISO 8601. Debe seguir siendo > loanDate original.
}
```

- **Response** `200 OK`:

```ts
{
  id: string;
  itemName: string;
  status: 'Loaned' | 'Returned' | 'Damaged';
  loanDate: string; // ISO 8601 — sin cambios
  dueDate: string;  // ISO 8601
  memberId: string; // sin cambios
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Regla de negocio `validateImmutableFields(body)` que lanza excepción si el body contiene `memberId` o `loanDate`. Regla `validateStatusTransition(currentStatus, newStatus)` que impide volver a `Loaned`.
- **Application**: Caso de uso `UpdateEquipmentLoanUseCase`. Orquesta: buscar el préstamo, validar campos inmutables, validar transición de estado, validar `dueDate` si se envía, persistir cambios. Puerto de salida `IEquipmentLoanRepository` (métodos `findById`, `update`).
- **Infrastructure**: `PrismaEquipmentLoanRepository` implementando `update`. Controlador `EquipmentLoanController` con la ruta `PUT` que extrae el `id` de la URL y mapea excepciones a códigos HTTP.

## Casos de Borde y Errores

| Escenario                                      | Resultado Esperado                                                   | Código HTTP actual               |
| ---------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| Préstamo inexistente                           | Mensaje: "El préstamo no existe."                                    | 404 Not Found             |
| Body contiene `memberId` o `loanDate`          | Mensaje: "El campo [X] no puede ser modificado."                     | 400 Bad Request           |
| `status` enviado como `Loaned`                 | Mensaje: "No se puede revertir el estado a 'Loaned'."               | 400 Bad Request           |
| `status` con valor fuera del enum              | Mensaje: "El estado debe ser 'Returned' o 'Damaged'."               | 422 Unprocessable Entity  |
| `dueDate` anterior o igual a `loanDate`        | Mensaje: "La fecha de devolución debe ser posterior a la de préstamo." | 400 Bad Request         |
| `itemName` vacío (string vacío)                | Mensaje: "El nombre del ítem no puede estar vacío."                  | 400 Bad Request           |
| Error de conexión a DB                         | Mensaje: "Error interno, reintente más tarde."                       | 500 Internal Server Error |

## Plan de Implementación

1. Definir el tipo `UpdateEquipmentLoanRequest` en `@alentapp/shared`.
2. Ampliar el puerto `IEquipmentLoanRepository` con el método `update`.
3. Implementar las reglas de dominio `validateImmutableFields` y `validateStatusTransition`.
4. Implementar `UpdateEquipmentLoanUseCase` en la capa de Application.
5. Ampliar `PrismaEquipmentLoanRepository` con el método `update`.
6. Crear la ruta `PUT /api/v1/equipment-loans/:id` en `EquipmentLoanController` y registrarla en `app.ts`.
7. Conectar la acción de edición/cierre en el Frontend con el nuevo endpoint.