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

describe('Sport API End-to-End Tests (5 Tests)', () => {
    let createdSportId: string;
    const testSportName = `Deporte E2E ${Math.floor(Math.random() * 100000)}`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        // Limpieza: borrar el deporte creado si todavía existe
        try {
            await prisma.sport.deleteMany({ where: { name: testSportName } });
        } catch (e) {
            // Si ya fue borrado en el último test, ignorar
        }
        await prisma.$disconnect();
        await app.close();
    });

    // ==========================================
    // Test 1: POST (Creación Real)
    // ==========================================
    it('1. POST /api/v1/deportes - debe crear un deporte en la base de datos real', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/deportes',
            payload: {
                name: testSportName,
                description: 'Deporte creado por tests E2E',
                maxCapacity: 20,
                additionalPrice: 500,
                requiresMedicalCertificate: false,
            },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data).toHaveProperty('id');
        expect(body.data.name).toBe(testSportName);
        expect(body.data.maxCapacity).toBe(20);
        expect(body.data.additionalPrice).toBe(500);

        createdSportId = body.data.id;

        // Verificar directamente en BD
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport).not.toBeNull();
        expect(dbSport?.name).toBe(testSportName);
        expect(dbSport?.max_capacity).toBe(20);
    });

    // ==========================================
    // Test 2: POST duplicado (Validación Real)
    // ==========================================
    it('2. POST /api/v1/deportes - debe retornar 409 si el nombre ya existe', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/deportes',
            payload: {
                name: testSportName,
                description: 'Intento de duplicado',
                maxCapacity: 10,
                additionalPrice: 0,
                requiresMedicalCertificate: false,
            },
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('Ya existe un deporte con ese nombre');
    });

    // ==========================================
    // Test 3: GET (Lectura Real)
    // ==========================================
    it('3. GET /api/v1/deportes - debe retornar la lista incluyendo el deporte creado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/deportes',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);

        const found = body.data.find((s: any) => s.id === createdSportId);
        expect(found).toBeDefined();
        expect(found.name).toBe(testSportName);
        expect(found.description).toBe('Deporte creado por tests E2E');
    });

    // ==========================================
    // Test 4: PUT (Actualización Real)
    // ==========================================
    it('4. PUT /api/v1/deportes/:id - debe actualizar campos en la base de datos real', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/deportes/${createdSportId}`,
            payload: {
                description: 'Descripción actualizada E2E',
                maxCapacity: 30,
            },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.description).toBe('Descripción actualizada E2E');
        expect(body.data.maxCapacity).toBe(30);

        // Verificar en BD
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport?.description).toBe('Descripción actualizada E2E');
        expect(dbSport?.max_capacity).toBe(30);
    });

    // ==========================================
    // Test 5: DELETE (Baja Real)
    // ==========================================
    it('5. DELETE /api/v1/deportes/:id - debe eliminar el deporte de la base de datos real', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/deportes/${createdSportId}`,
        });

        expect(response.statusCode).toBe(204);

        // Verificar que ya no existe en BD
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport).toBeNull();
    });
});
