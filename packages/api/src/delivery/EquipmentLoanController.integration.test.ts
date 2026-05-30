import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

vi.mock('../infrastructure/PrismaEquipmentLoanRepository.js', () => {
    const loanLoaned: Record<string, unknown> = {
        id: 'loan-uuid-1',
        itemName: 'Pelota de fútbol',
        status: 'Loaned',
        loanDate: '2026-05-01T10:00:00.000Z',
        dueDate: '2099-05-10T10:00:00.000Z',
        memberId: 'member-uuid-1',
        memberName: 'Alberto Tesorero',
    };

    const loanReturned: Record<string, unknown> = {
        ...loanLoaned,
        id: 'loan-uuid-2',
        status: 'Returned',
    };

    return {
        PrismaEquipmentLoanRepository: class {
            async findAll() { return [loanLoaned, loanReturned]; }
            async findById(id: string) {
                if (id === 'loan-uuid-1') return loanLoaned;
                if (id === 'loan-uuid-2') return loanReturned;
                return null;
            }
            async create(data: Record<string, unknown>) {
                return {
                    id: 'loan-uuid-new',
                    ...data,
                    status: 'Loaned',
                    loanDate: new Date().toISOString(),
                    memberName: 'Alberto Tesorero',
                };
            }
            async update(id: string, data: Record<string, unknown>) {
                return { ...loanLoaned, id, ...data };
            }
            async delete() { return; }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                if (id === 'member-uuid-1') {
                    return {
                        id: 'member-uuid-1',
                        name: 'Alberto Tesorero',
                        category: 'Pleno',
                        birthdate: '1985-01-01',
                        dni: '12345678',
                        email: 'alberto@club.com',
                        status: 'Activo',
                        created_at: '2026-01-01T00:00:00.000Z',
                    };
                }
                if (id === 'member-cadete') {
                    return {
                        id: 'member-cadete',
                        name: 'Cadete Test',
                        category: 'Cadete',
                        birthdate: '2015-01-01',
                        dni: '99999999',
                        email: 'cadete@club.com',
                        status: 'Activo',
                        created_at: '2026-01-01T00:00:00.000Z',
                    };
                }
                return null;
            }
            async findByDni() { return null; }
            async create(data: Record<string, unknown>) { return { id: 'new', ...data }; }
            async update(id: string, data: Record<string, unknown>) { return { id, ...data }; }
            async delete() { return; }
        },
    };
});

describe('EquipmentLoan API - Tests de Integración', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/equipment-loans', () => {
        it('debe retornar 200 con el listado de préstamos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/equipment-loans',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].itemName).toBe('Pelota de fútbol');
            expect(body.data[0].memberName).toBe('Alberto Tesorero');
        });
    });

    describe('POST /api/v1/equipment-loans', () => {
        it('debe retornar 201 y crear el préstamo para un socio Pleno', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    itemName: 'Raqueta de tenis',
                    dueDate: '2099-12-01T00:00:00.000Z',
                    memberId: 'member-uuid-1',
                },
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.itemName).toBe('Raqueta de tenis');
            expect(body.data.status).toBe('Loaned');
        });

        it('debe retornar 403 si el socio tiene categoría Cadete', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    itemName: 'Pelota',
                    dueDate: '2099-12-01T00:00:00.000Z',
                    memberId: 'member-cadete',
                },
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Cadete');
        });

        it('debe retornar 404 si el socio no existe', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    itemName: 'Pelota',
                    dueDate: '2099-12-01T00:00:00.000Z',
                    memberId: 'uuid-que-no-existe',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio no existe.');
        });
    });

    describe('PUT /api/v1/equipment-loans/:id', () => {
        it('debe retornar 200 al actualizar el estado correctamente', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/loan-uuid-1',
                payload: { status: 'Returned' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Returned');
        });

        it('debe retornar 404 si el préstamo no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/uuid-que-no-existe',
                payload: { status: 'Returned' },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El préstamo no existe.');
        });
    });

    describe('DELETE /api/v1/equipment-loans/:id', () => {
        it('debe retornar 403 si el préstamo está en estado Returned', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/loan-uuid-2',
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Loaned');
        });
    });
});