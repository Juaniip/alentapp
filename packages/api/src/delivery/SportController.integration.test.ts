import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest } from '@alentapp/shared';

// Mockeamos el repositorio de Sport para que la API funcione sin base de datos real.
// Esto testea el ciclo completo: Fastify routing -> SportController -> UseCase -> SportValidator.
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    const sports = [
        {
            id: 'sport-uuid-1',
            name: 'Fútbol',
            description: 'El deporte más popular del mundo',
            maxCapacity: 20,
            additionalPrice: 500,
            requiresMedicalCertificate: false,
        },
        {
            id: 'sport-uuid-2',
            name: 'Tenis',
            description: 'Deporte de raqueta',
            maxCapacity: 10,
            additionalPrice: 200,
            requiresMedicalCertificate: true,
        },
    ];

    return {
        PostgresSportRepository: class {
            async findAll() { return sports; }
            async findByName(name: string) { return sports.find(s => s.name === name) ?? null; }
            async findById(id: string) { return sports.find(s => s.id === id) ?? null; }
            async create(data: any) { return { id: 'sport-uuid-new', ...data }; }
            async update(id: string, data: any) {
                const sport = sports.find(s => s.id === id);
                return { ...sport, ...data };
            }
            async delete(_id: string) { return; }
            async hasActiveEnrollments(sportId: string) { return sportId === 'sport-uuid-2'; }
        },
    };
});

// Mocks mínimos de los demás repositorios que buildApp() instancia
vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async findByDni() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    },
}));

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => ({
    PostgresPaymentRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    },
}));

vi.mock('../infrastructure/PrismaLockerRepository.js', () => ({
    PrismaLockerRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async findByMemberId() { return null; }
        async existsByNumber() { return false; }
        async save(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    },
}));

vi.mock('../infrastructure/PrismaEquipmentLoanRepository.js', () => ({
    PrismaEquipmentLoanRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    },
}));

describe('Sport API - Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/deportes', () => {
        it('debe retornar 200 con la lista de deportes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/deportes',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data.length).toBe(2);
            expect(body.data[0].name).toBe('Fútbol');
        });
    });

    describe('POST /api/v1/deportes', () => {
        it('debe retornar 201 y el deporte creado', async () => {
            const payload: CreateSportRequest = {
                name: 'Natación',
                description: 'Deporte acuático',
                maxCapacity: 15,
                additionalPrice: 300,
                requiresMedicalCertificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/deportes',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('sport-uuid-new');
            expect(body.data.name).toBe('Natación');
        });

        it('debe atravesar la capa de validación y retornar 409 si el nombre ya existe', async () => {
            const payload: CreateSportRequest = {
                name: 'Fútbol',
                description: 'Descripción alternativa',
                maxCapacity: 10,
                additionalPrice: 0,
                requiresMedicalCertificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/deportes',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Ya existe un deporte con ese nombre');
        });

        it('debe retornar 400 si el nombre está vacío', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/deportes',
                payload: {
                    name: '',
                    description: 'Descripción',
                    maxCapacity: 10,
                    additionalPrice: 0,
                    requiresMedicalCertificate: false,
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Faltan campos requeridos');
        });

        it('debe retornar 400 si maxCapacity es cero', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/deportes',
                payload: {
                    name: 'Básquet',
                    description: 'Deporte de pelota',
                    maxCapacity: 0,
                    additionalPrice: 0,
                    requiresMedicalCertificate: false,
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El cupo máximo debe ser mayor a cero');
        });

        it('debe retornar 400 si maxCapacity es negativo', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/deportes',
                payload: {
                    name: 'Básquet',
                    description: 'Deporte de pelota',
                    maxCapacity: -5,
                    additionalPrice: 0,
                    requiresMedicalCertificate: false,
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El cupo máximo debe ser mayor a cero');
        });
    });

    describe('PUT /api/v1/deportes/:id', () => {
        it('debe retornar 200 con los datos actualizados', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/deportes/sport-uuid-1',
                payload: { description: 'Nueva descripción', maxCapacity: 25 },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.description).toBe('Nueva descripción');
            expect(body.data.maxCapacity).toBe(25);
        });

        it('debe retornar 400 si se intenta modificar el nombre', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/deportes/sport-uuid-1',
                payload: { name: 'Otro nombre' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El nombre del deporte no puede modificarse');
        });

        it('debe retornar 400 si maxCapacity es inválido', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/deportes/sport-uuid-1',
                payload: { maxCapacity: -5 },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El cupo máximo debe ser mayor a cero');
        });

        // Requiere PR fix/sport-http-404-recurso-no-encontrado (PR #51)
        it('debe retornar 404 si el deporte no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/deportes/sport-uuid-999',
                payload: { description: 'Nueva' },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El deporte no existe');
        });
    });

    describe('DELETE /api/v1/deportes/:id', () => {
        it('debe retornar 204 al eliminar un deporte sin inscripciones activas', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/deportes/sport-uuid-1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 409 si el deporte tiene inscripciones activas', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/deportes/sport-uuid-2',
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('No se puede eliminar un deporte con inscripciones activas');
        });

        // Requiere PR fix/sport-http-404-recurso-no-encontrado (PR #51)
        it('debe retornar 404 si el deporte no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/deportes/sport-uuid-999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('El deporte no existe');
        });
    });
});
