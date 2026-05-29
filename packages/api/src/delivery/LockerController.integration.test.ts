import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateLockerRequest } from '@alentapp/shared';

// Mockeamos el repositorio para que la API entera funcione sin conectarse a la Base de Datos real
// Esto nos permite testear la integración del ciclo completo: Fastify -> Controller -> UseCase
vi.mock('../infrastructure/PrismaLockerRepository.js', () => {
    return {
        PrismaLockerRepository: class {
            async findAll() {
                return [
                    { id: '1', number: 1, location: 'Sector A', status: 'Available', member_id: null },
                    { id: '2', number: 2, location: 'Sector B', status: 'Occupied', member_id: 'member-1' },
                ];
            }
            async findById(id: string) {
                if (id === '1') {
                    return { id: '1', number: 1, location: 'Sector A', status: 'Available', member_id: null };
                }
                if (id === '2') {
                    return { id: '2', number: 2, location: 'Sector B', status: 'Occupied', member_id: 'member-1' };
                }
                return null;
            }
            async findByMemberId(memberId: string) {
                if (memberId === 'member-1') {
                    return { id: '2', number: 2, location: 'Sector B', status: 'Occupied', member_id: 'member-1' };
                }
                return null;
            }
            async existsByNumber(number: number) {
                return number === 1 || number === 2;
            }
            async save(data: any) {
                return { id: '3', ...data, member_id: null };
            }
            async update(id: string, data: any) {
                return { id, number: 1, location: 'Sector A', status: 'Available', member_id: null, ...data };
            }
            async delete(_id: string) { return; }
        }
    };
});

// Mockeamos también el repo de Members para que el resto del app funcione
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(_id: string) { return null; }
            async findByDni(_dni: string) { return null; }
            async create(data: any) { return { id: '1', ...data }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete(_id: string) { return; }
        }
    };
});

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/lockers', () => {
        it('debe retornar código 200 y el listado de casilleros', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data.length).toBe(2);
            expect(body.data[0].number).toBe(1);
        });
    });

    describe('POST /api/v1/lockers', () => {
        it('debe retornar 201 y crear el casillero', async () => {
            const payload: CreateLockerRequest = {
                number: 99,
                location: 'Sector Nuevo',
                status: 'Available'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.number).toBe(99);
            expect(body.data.member_id).toBeNull();
        });

        it('debe atravesar la capa de validación y retornar 409 si el número ya existe', async () => {
            const payload: CreateLockerRequest = {
                number: 1, // Este número lo mockeamos como existente
                location: 'Sector X',
                status: 'Available'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Ya existe un casillero');
        });
    });

    describe('PUT /api/v1/lockers/:id', () => {
        it('debe retornar 200 al actualizar la ubicación correctamente', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: { location: 'Nueva Ubicación' }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.location).toBe('Nueva Ubicación');
        });

        it('debe retornar 404 si el casillero no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/999',
                payload: { location: 'X' }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });

    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe retornar 204 si se elimina correctamente un casillero Available', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/1'
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 409 si el casillero está Occupied', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/2' // Este está Occupied en el mock
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('actualmente asignado');
        });
    });
});