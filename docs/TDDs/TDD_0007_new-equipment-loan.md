---
id: 0007
estado: Pendiente
autor: Valentino Chiappini
fecha: 2026-05-01
titulo: Registro de Préstamo de Equipamiento
---

# TDD-0007: Registro de Préstamo de Equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos registrar el préstamo de equipamiento deportivo a un socio, garantizando que solo los socios habilitados (categoría **Senior** o **Lifetime**) puedan solicitar material, sin necesidad de que el administrativo deba verificarlo manualmente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Registrar rápidamente qué material se le presta a qué socio y hasta cuándo debe devolverlo. Si intenta prestarle algo a un socio Cadet, el sistema debe impedírselo automáticamente con un mensaje claro.

### Criterios de Aceptación

- El sistema debe rechazar la creación si el socio tiene categoría `Cadet`, retornando un error descriptivo.
- El sistema debe permitir crear el préstamo únicamente para socios con categoría `Senior` o `Lifetime`.
- El campo `status` debe ser asignado automáticamente como `Loaned` por el servidor; el cliente no puede definirlo.
- El campo `loan_date` debe ser asignado automáticamente con la fecha y hora actuales del servidor.
- La `due_date` debe ser estrictamente posterior al momento de creación.
- Si el registro es exitoso, debe retornar el objeto del préstamo creado.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá el modelo `EquipmentLoan` en Prisma con las siguientes propiedades:

- `id`: UUID, clave primaria, generado automáticamente.
- `itemName`: String, requerido, no vacío.
- `status`: Enum `LoanStatus` (`Loaned` | `Returned` | `Damaged`), por defecto `Loaned`.
- `loanDate`: DateTime, asignado automáticamente por el servidor con `now()`.
- `dueDate`: DateTime, requerido. Debe ser posterior a `loanDate`.
- `memberId`: UUID, FK hacia `Member`.

```prisma
model EquipmentLoan {
  id        String     @id @default(uuid())
  itemName  String
  status    LoanStatus @default(Loaned)
  loanDate  DateTime   @default(now())
  dueDate   DateTime
  memberId  String
  member    Member     @relation(fields: [memberId], references: [id])
}

enum LoanStatus {
  Loaned
  Returned
  Damaged
}
```

### Contrato de API (`@alentapp/shared`)

- **Request Body**:

```ts
{
  itemName: string;  // Requerido. No puede estar vacío.
  dueDate: string;   // ISO 8601. Debe ser posterior a NOW().
  memberId: string;  // UUID del socio. Debe existir y ser Senior o Lifetime.
}
```

- **Response** `201 Created`:

```ts
{
  id: string;
  itemName: string;
  status: 'Loaned';
  loanDate: string; // ISO 8601
  dueDate: string;  // ISO 8601
  memberId: string;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Entidad `EquipmentLoan`. Regla de negocio `validateMemberCategory(member)` que lanza excepción si `member.category === 'Cadet'`. Regla `validateDueDate(dueDate, loanDate)` que lanza excepción si `dueDate <= loanDate`.
- **Application**: Caso de uso `CreateEquipmentLoanUseCase`. Orquesta: buscar el socio, validar su categoría, validar la fecha, persistir el préstamo. Puerto de salida `IEquipmentLoanRepository` (método `create`). Puerto de salida `IMemberRepository` (método `findById`).
- **Infrastructure**: `PrismaEquipmentLoanRepository` implementando `create`. Controlador `EquipmentLoanController` con la ruta `POST` que mapea excepciones de dominio a códigos HTTP.

## Casos de Borde y Errores

| Escenario                                      | Resultado Esperado                                                   | Código HTTP actual               |
| ---------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| Socio con categoría `Cadet`                    | Mensaje: "Los socios Cadet no pueden solicitar equipamiento."        | 403 Forbidden             |
| `memberId` no existe                           | Mensaje: "El socio no existe."                                       | 404 Not Found             |
| `dueDate` anterior o igual a `loanDate`        | Mensaje: "La fecha de devolución debe ser posterior a la de préstamo." | 400 Bad Request         |
| `itemName` vacío o ausente                     | Mensaje: "El nombre del ítem es requerido."                          | 400 Bad Request           |
| Error de conexión a DB                         | Mensaje: "Error interno, reintente más tarde."                       | 500 Internal Server Error |

## Plan de Implementación

1. Definir el enum `LoanStatus` y el tipo `CreateEquipmentLoanRequest` en `@alentapp/shared`.
2. Agregar el modelo `EquipmentLoan` en el schema de Prisma y ejecutar la migración.
3. Implementar la entidad de dominio y las reglas de negocio (`validateMemberCategory`, `validateDueDate`).
4. Definir el puerto `IEquipmentLoanRepository` con el método `create`.
5. Implementar `CreateEquipmentLoanUseCase` en la capa de Application.
6. Implementar `PrismaEquipmentLoanRepository` con el método `create`.
7. Crear la ruta `POST /api/v1/equipment-loans` en `EquipmentLoanController` y registrarla en `app.ts`.
8. Conectar el formulario de alta en el Frontend con el nuevo endpoint.