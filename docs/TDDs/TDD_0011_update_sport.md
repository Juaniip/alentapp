---
id: 0011
estado: Propuesto
autor: Sergio Adrián Maldonado
fecha: 2026-05-01
titulo: Actualización de Deportes Existentes
---

# TDD-0011: Actualización de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos modificar la información de un deporte existente en el catálogo, como su descripción, cupo máximo, precio adicional o exigencia de certificado médico, sin afectar la identidad del deporte ni su historial de inscripciones. La regla central de este TDD es la **inmutabilidad del nombre**: el `name` del deporte no puede modificarse una vez creado.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Ajustar rápidamente la configuración de los deportes desde la tabla del panel de administración. Por ejemplo, ampliar el cupo de un deporte cuando se habilita una nueva cancha, actualizar el precio adicional cuando cambia la cuota, o cambiar la exigencia de certificado médico tras una decisión de la comisión directiva.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos editables del deporte: `description`, `maxCapacity`, `additionalPrice`, `requiresMedicalCertificate`.
- El sistema **no debe permitir modificar el `name`** del deporte. Si el cliente envía ese campo, debe responder con un error de validación.
- El sistema debe validar que `maxCapacity`, en caso de ser modificado, sea un entero estrictamente mayor a cero.
- Si la edición es correcta, debe retornar los nuevos datos del deporte actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial. El campo `name` **no se expone** en la interfaz para reforzar a nivel de tipos su inmutabilidad.

- Endpoint: `PUT /api/v1/deportes/:id`
- Request Body (UpdateSportRequest):

```ts
{
    description?: string;
    maxCapacity?: number;
    additionalPrice?: number;
    requiresMedicalCertificate?: boolean;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `SportRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `SportValidator` (Encargado de centralizar la validación de `maxCapacity > 0` y la validación defensiva contra modificación de `name`).
3. **Caso de Uso**: `UpdateSportUseCase` (Orquesta la validación, verifica existencia previa vía `findById` y llama al repositorio).
4. **Adaptador de Salida**: `PostgresSportRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `SportController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                              | Resultado Esperado                                         | Código HTTP actual        |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| Deporte inexistente                    | Mensaje: "El deporte no existe"                            | 400 Bad Request           |
| Intento de modificar `name`            | Mensaje: "El nombre del deporte no puede modificarse"      | 400 Bad Request           |
| `maxCapacity <= 0`                     | Mensaje: "El cupo máximo debe ser mayor a cero"            | 400 Bad Request           |
| Error de conexión a DB                 | Mensaje: "Error interno, reintente más tarde"              | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateSportRequest` sin el campo `name`).
2. Ampliar el `SportRepository` con el método `update`.
3. Implementar la lógica en `UpdateSportUseCase` utilizando el `SportValidator` centralizado, incluida la validación defensiva contra modificación de `name`.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación, deshabilitando el campo `name` en modo edición.
