---
id: 0004
estado: Pendiente
autor: Juan Ignacio Wilt
fecha: 2026-05-01
titulo: Alta de Locker
---

# TDD-0004: Alta de Locker

## Contexto de Negocio (PRD)

### Objetivo
Permitir el registro de un nuevo casillero (Locker) en el sistema de la aplicación Alentapp para su posterior administración y asignación a los socios del club.

### User Persona
* Nombre: Administrador del Sistema / Personal de Mantenimiento.
* Necesidad: Registrar los nuevos casilleros físicos que se instalan en el club especificando su número y ubicación para mantener el inventario digital sincronizado con la realidad física.

### Criterios de Aceptación
* El sistema debe validar que el número de casillero (`number`) sea único en toda la base de datos.
* El sistema debe permitir la creación del casillero definiendo su estado inicial dentro de los valores permitidos: "Available", "Occupied" o "Maintenance".
* Al finalizar el alta, el casillero no debe tener ningún socio asignado de manera predeterminada (`member_id` nulo).
* Los campos de número (`number`) y ubicación (`location`) deben ser obligatorios.

## Diseño Técnico (RFC)

### Modelo de Datos
La entidad Locker cuenta con los siguientes atributos según el Diagrama de Entidad-Relación:
* `id`: uuid (Primary Key).
* `number`: int (Unique Key).
* `location`: string.
* `status`: string (Solo permite los valores: Available, Occupied, Maintenance).
* `member_id`: uuid (Foreign Key, nullable).

### Contrato de API (@alentapp/shared)
Se define el endpoint para la creación del recurso Locker.
* **Endpoint**: `POST /api/v1/lockers`
* **Request Body**:
```ts
{
    "number": number,
    "location": string,
    "status": "Available" | "Maintenance" // Generalmente no nace como Occupied
}
```

### Componentes de Arquitectura Hexagonal
* **Domain**:
    * Entidad `Locker`.
    * Regla de negocio principal: Garantizar la unicidad del atributo `number`.
    * Validación de estado inicial permitido.
* **Application**:
    * Caso de Uso: `CreateLockerUseCase`.
    * Puertos de Salida: `LockerRepository` con la definición de los métodos `existsByNumber(number)` y `save(locker)`.
* **Infrastructure**:
    * Controlador: `CreateLockerController` para recibir la petición HTTP.
    * Adaptador: `PrismaLockerRepository` para implementar la persistencia en la base de datos verificando restricciones únicas.

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP actual              |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Número de casillero duplicado | Error indicando que el "number" ya está registrado | 409 Conflict              |
| Estado (status) inválido    | Error de validación especificando los estados permitidos (Available, Occupied, Maintenance)| 400 Bad Request           |
| Falta ubicación o número    | Error de validación por campos obligatorios faltantes | 400 Bad Request           |

## Plan de Implementación
1. Definir los tipos, interfaces y enums de estado (`LockerStatus`) en el paquete `@alentapp/shared`.
2. Modelar la entidad `Locker` en el archivo de Prisma (ej. `schema.prisma`), aplicando `@unique` al campo `number`.
3. Implementar el modelo de dominio `Locker` y el servicio de aplicación `CreateLockerUseCase`.
4. Desarrollar el adaptador de infraestructura `PrismaLockerRepository` cumpliendo el contrato del puerto de salida.
5. Crear el controlador HTTP `CreateLockerController` y configurar las rutas correspondientes en la API.
