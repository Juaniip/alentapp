import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { buildApp } from '../app.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

let app: any;

describe('Locker API End-to-End Tests (3 Tests)', () => {
    let testLockerId: string;
    const testLockerNumber = Math.floor(Math.random() * 1000000) + 100000;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        // Limpieza: borrar el locker creado si todavía existe
        try {
            await prisma.locker.deleteMany({ where: { number: testLockerNumber } });
        } catch (e) {
            // Si ya fue borrado en el último test, ignorar
        }

        await prisma.$disconnect();
        await app.close();
    });

    // ==========================================
    // Test 1: POST (Creación Real)
    // ==========================================
    it('1. POST /api/v1/lockers - Debe crear un casillero en la base de datos real', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload: {
                number: testLockerNumber,
                location: 'Sector E2E - Planta Baja',
                status: 'Available'
            }
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data).toHaveProperty('id');
        expect(body.data.number).toBe(testLockerNumber);
        expect(body.data.status).toBe('Available');
        expect(body.data.member_id).toBeNull();

        testLockerId = body.data.id;
    });

    // ==========================================
    // Test 2: GET (Lectura Real)
    // ==========================================
    it('2. GET /api/v1/lockers - Debe retornar la lista que incluye el casillero creado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers'
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);

        const lockerFound = body.data.find((l: any) => l.id === testLockerId);
        expect(lockerFound).toBeDefined();
        expect(lockerFound.number).toBe(testLockerNumber);
        expect(lockerFound.location).toBe('Sector E2E - Planta Baja');
    });

    // ==========================================
    // Test 3: DELETE (Baja Real)
    // ==========================================
    it('3. DELETE /api/v1/lockers/:id - Debe eliminar el casillero de la base de datos real', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${testLockerId}`
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no lo encuentre en la DB real
        const deletedLocker = await prisma.locker.findUnique({
            where: { id: testLockerId }
        });

        expect(deletedLocker).toBeNull();
    });
});