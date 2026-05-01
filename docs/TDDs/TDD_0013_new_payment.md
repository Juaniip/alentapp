---
id: 0013
estado: Propuesto
autor: Álvaro Marini
fecha: 2026-05-01
titulo: Registro de Nuevos Pagos
---

# TDD-0004: Registro de Nuevos Pagos

## Contexto de Negocio (PRD)

### Objetivo

Permitir a la administración registrar la generación de una nueva obligación de pago (cuota o arancel) para un socio específico, asegurando que quede asentada en el sistema para su posterior cobro.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cargar las cuotas o cargos extra a los socios a principio de mes de forma rápida. Necesita asegurarse de que el cargo se asigne al socio correcto y que quede pendiente de cobro.

### Criterios de Aceptación

- El sistema debe validar que el socio (`member_id`) al que se le asigna el pago realmente exista en el sistema.
- El sistema debe validar que el monto (`amount`) sea un valor numérico positivo.
- El sistema debe inicializar el pago con el estado "Pending" por defecto.
- El campo `payment_date` debe quedar nulo/vacío al momento de la creación, ya que el pago aún no se efectuó.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y permitir seguir cargando pagos si es necesario.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Payment` con las siguientes propiedades extraídas del modelo relacional:

- `id`: Identificador único universal (UUID, PK).
- `amount`: Valor numérico de punto flotante (Float).
- `month`: Valor numérico entero (Int) representando el mes del período.
- `year`: Valor numérico entero (Int) representando el año del período.
- `status`: Enumeración en formato texto (`Pending`, `Paid`, `Canceled`) con valor por defecto `Pending`.
- `due_date`: Fecha de vencimiento (Date).
- `payment_date`: Fecha y hora del pago (Datetime, opcional/nulo al crear).
- `member_id`: Identificador único del socio (UUID, FK).

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/payments`
- Request Body (CreatePaymentRequest):
```ts
{
    amount: number;
    month: number;
    year: number;
    due_date: string; // ISO Date String (YYYY-MM-DD)
    member_id: string; // UUID referenciando al socio
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Interface en el Dominio con método `save`).
2. **Caso de Uso**: `CreatePaymentUseCase` (Lógica que verifica que el `member_id` exista en el `MemberRepository` antes de crear la entidad `Payment`).
3. **Adaptador de Salida**: `PostgresPaymentRepository` (Implementación real en BD usando Prisma).
4. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP POST).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Socio inexistente          | Mensaje: "El socio especificado no existe"    | 404 Not Found             |
| Monto negativo o cero      | Mensaje: "El monto debe ser mayor a 0"        | 400 Bad Request           |
| Falta de campos requeridos | Mensaje: "Faltan campos obligatorios"         | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Creación exitosa           | Retorna la entidad con status "Pending"       | 201 Created               |

## Plan de Implementación

1. Definir esquema de persistencia en Prisma reflejando las columnas y la FK hacia Member, y correr migración.
2. Crear tipos (`CreatePaymentRequest`) en el paquete `@alentapp/shared` y el puerto en el Dominio.
3. Implementar el repositorio y el caso de uso `CreatePaymentUseCase`.
4. Crear la ruta POST en el controlador y conectar con la aplicación.
5. Crear el formulario de carga en el frontend (React) permitiendo seleccionar el socio y enviar el request al backend.