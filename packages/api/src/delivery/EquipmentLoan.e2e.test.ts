import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { buildApp } from '../app.js';

describe('EquipmentLoan API End-to-End Tests (3 Tests)', () => {
    let app: any;
    let prisma: PrismaClient;
    let testMemberId: string;
    let testLoanId: string;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        // Instanciamos Prisma dentro del beforeAll, igual que Member.e2e.test.ts,
        // para asegurarnos de que DATABASE_URL ya está cargado por dotenv
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });
        await prisma.$connect();

        // Creamos un socio Pleno directamente en la DB para usarlo en los tests
        const member = await prisma.member.create({
            data: {
                dni: `E2E-EL-${Date.now()}`,
                name: 'Socio E2E EquipmentLoan',
                email: `e2e-el-${Date.now()}@test.com`,
                category: 'Pleno',
                status: 'Activo',
                created_at: new Date(),
            },
        });
        testMemberId = member.id;
    });

    afterAll(async () => {
        // Limpieza: borrar préstamos y socio de prueba
        if (testLoanId) {
            await prisma.equipmentLoan.deleteMany({ where: { memberId: testMemberId } });
        }
        if (testMemberId) {
            await prisma.member.delete({ where: { id: testMemberId } });
        }

        await prisma.$disconnect();
        await app.close();
    });

    // ==========================================
    // Test 1: POST (Creación Real)
    // ==========================================
    it('1. POST /api/v1/equipment-loans - Debe crear un préstamo en la base de datos real', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                itemName: 'Raqueta de tenis E2E',
                memberId: testMemberId,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
            },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data).toHaveProperty('id');
        expect(body.data.itemName).toBe('Raqueta de tenis E2E');
        expect(body.data.status).toBe('Loaned');

        testLoanId = body.data.id;

        // Verificación directa en PostgreSQL
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: testLoanId } });
        expect(dbLoan).not.toBeNull();
    });

    // ==========================================
    // Test 2: GET (Lectura Real)
    // ==========================================
    it('2. GET /api/v1/equipment-loans - Debe retornar la lista que incluye el préstamo creado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/equipment-loans',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);

        const loanFound = body.data.find((l: any) => l.id === testLoanId);
        expect(loanFound).toBeDefined();
        expect(loanFound.itemName).toBe('Raqueta de tenis E2E');
        expect(loanFound.status).toBe('Loaned');
    });

    // ==========================================
    // Test 3: DELETE (Baja Real)
    // ==========================================
    it('3. DELETE /api/v1/equipment-loans/:id - Debe eliminar el préstamo en estado Loaned de la base de datos real', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/equipment-loans/${testLoanId}`,
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no lo encuentre en la DB real
        const deletedLoan = await prisma.equipmentLoan.findUnique({ where: { id: testLoanId } });
        expect(deletedLoan).toBeNull();
    });
});