---
id: 0010
estado: Propuesto
autor: Sergio Adrián Maldonado
fecha: 2026-05-01
titulo: Registro de Nuevos Deportes
---

# TDD-0010: Registro de Nuevos Deportes

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo dé de alta de forma digital los deportes que se ofrecen en el club, manteniendo un catálogo centralizado y consistente. Este catálogo es la entidad maestra sobre la que se apoya el proceso de inscripción (`Enrollment`): define cupos, precios adicionales y la exigencia de certificado médico para cada disciplina.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cargar nuevos deportes en el catálogo cuando el club incorpora una disciplina, sin riesgo de duplicar nombres ni de configurar cupos inválidos. Quiere un alta rápida desde el panel de administración sin ambigüedad sobre qué campos puede modificar después.

### Criterios de Aceptación

- El sistema debe validar que el `name` del deporte sea único en el catálogo.
- El sistema debe validar que `maxCapacity` sea un número entero estrictamente mayor a cero.
- El sistema debe permitir indicar si el deporte requiere certificado médico (`requiresMedicalCertificate`).
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.
- El deporte queda registrado con su `name` marcado como inmutable de allí en adelante (la modificación posterior de `name` está prohibida — ver TDD-0011).

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Sport` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `name`: Cadena de texto, único e indexado. Inmutable después de la creación.
- `description`: Cadena de texto.
- `maxCapacity`: Entero, validado en dominio para que sea > 0.
- `additionalPrice`: Número decimal (precio adicional por la disciplina).
- `requiresMedicalCertificate`: Booleano.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/deportes`
- Request Body (CreateSportRequest):

```ts
{
    name: string;
    description: string;
    maxCapacity: number;
    additionalPrice: number;
    requiresMedicalCertificate: boolean;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `SportRepository` (Interface en el Dominio con métodos `create` y `findByName`).
2. **Caso de Uso**: `CreateSportUseCase` (Lógica que verifica si el `name` ya existe y valida `maxCapacity > 0` antes de llamar al repositorio).
3. **Adaptador de Salida**: `PostgresSportRepository` (Implementación real en BD usando Prisma).
4. **Adaptador de Entrada**: `SportController` (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                       | Resultado Esperado                                          | Código HTTP actual        |
| ------------------------------- | ----------------------------------------------------------- | ------------------------- |
| Nombre ya registrado            | Mensaje: "Ya existe un deporte con ese nombre"              | 409 Conflict              |
| `maxCapacity <= 0`              | Mensaje: "El cupo máximo debe ser mayor a cero"             | 400 Bad Request           |
| Datos faltantes                 | Mensaje: "Faltan campos requeridos"                         | 400 Bad Request           |
| Error de conexión a DB          | Mensaje: "Error interno, reintente más tarde"               | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia (`Sport` en `schema.prisma`) y correr migración.
2. Crear tipos en `@alentapp/shared` (`CreateSportRequest`) y puerto `SportRepository` en el Dominio.
3. Implementar el `PostgresSportRepository` y el `CreateSportUseCase`.
4. Crear formulario en React y conectar con el endpoint del backend.
