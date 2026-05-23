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

describe('Payment API End-to-End Tests (3 Tests)', () => {
    let testMemberId: string;
    let testPaymentId: string;

    beforeAll(async () => {
        app = buildApp();
        await app.ready(); 

        const member = await prisma.member.create({
            data: {
                dni: `E2E-${Date.now()}`,
                name: 'Socio de Prueba E2E',
                email: `e2e-${Date.now()}@test.com`,
                category: 'Pleno',
                status: 'Activo',
                created_at: new Date()
            }
        });
        testMemberId = member.id;
    });

    afterAll(async () => {
        await prisma.payment.deleteMany({ where: { member_id: testMemberId } });
        await prisma.member.delete({ where: { id: testMemberId } });
        
        await prisma.$disconnect();
        await app.close();
    });

    // ==========================================
    // Test 1: POST (Creación Real)
    // ==========================================
    it('1. POST /api/v1/payments - Debe crear un pago en la base de datos real', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload: {
                member_id: testMemberId,
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10T00:00:00.000Z'
            }
        });

        expect(response.statusCode).toBe(201);
        
        const body = JSON.parse(response.payload);
        expect(body.data).toHaveProperty('id');
        expect(body.data.status).toBe('Pending');
        
        testPaymentId = body.data.id; 
    });

    // ==========================================
    // Test 2: GET (Lectura Real)
    // ==========================================
    it('2. GET /api/v1/payments - Debe retornar la lista que incluye el pago creado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/payments'
        });

        expect(response.statusCode).toBe(200);
        
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
        
        const paymentFound = body.data.find((p: any) => p.id === testPaymentId);
        expect(paymentFound).toBeDefined();
        expect(paymentFound.amount).toBe(15000);
    });

    // ==========================================
    // Test 3: DELETE (Baja Lógica Real)
    // ==========================================
    it('3. DELETE /api/v1/payments/:id - Debe anular el pago persistiendo el estado en DB', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/payments/${testPaymentId}`
        });

        expect(response.statusCode).toBe(204);

        const canceledPayment = await prisma.payment.findUnique({
            where: { id: testPaymentId }
        });
        
        expect(canceledPayment?.status).toBe('Canceled');
    });
});