import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentController } from './PaymentController.js';
import { CreatePaymentUseCase } from '../application/NewPaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { CancelPaymentUseCase } from '../application/DeletePaymentUseCase.js';

// Simulamos los repositorios para aislar la base de datos de la prueba de integración
const mockPaymentRepository = {
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
};

const mockMemberRepository = {
    findById: vi.fn(),
};

// Instanciamos los Casos de Uso REALES inyectando los repositorios simulados
const createPaymentUseCase = new CreatePaymentUseCase(mockPaymentRepository as any, mockMemberRepository as any);
const getPaymentsUseCase = new GetPaymentsUseCase(mockPaymentRepository as any);
const updatePaymentUseCase = new UpdatePaymentUseCase(mockPaymentRepository as any);
const cancelPaymentUseCase = new CancelPaymentUseCase(mockPaymentRepository as any);

// Instanciamos el Controlador REAL inyectando los casos de uso
const paymentController = new PaymentController(
    createPaymentUseCase,
    getPaymentsUseCase,
    updatePaymentUseCase,
    cancelPaymentUseCase
);

// Utilidad para simular el objeto Reply de Fastify
const mockReply = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
};

describe('PaymentController - Integration Tests (6 Tests)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ==========================================
    // 1. GET (Lectura)
    // ==========================================
    it('1. GET /payments - Debe integrar Controlador -> UseCase y devolver 200 con datos', async () => {
        const fakeData = [{ id: '1', amount: 1000 }, { id: '2', amount: 2000 }];
        mockPaymentRepository.findAll.mockResolvedValue(fakeData);
        
        const reply = mockReply();
        const request = {} as any; // No requiere body ni params

        await paymentController.getAll(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({ data: fakeData });
    });

    // ==========================================
    // 2 y 3. POST (Creación - Éxito y Error)
    // ==========================================
    it('2. POST /payments - Debe integrar Controlador -> UseCase y devolver 201 al crear', async () => {
        const request = {
            body: { member_id: '123', amount: 15000, month: 5, year: 2026, due_date: '2026-05-10' }
        } as any;
        const reply = mockReply();

        mockMemberRepository.findById.mockResolvedValue({ id: '123' }); // Socio real
        mockPaymentRepository.create.mockResolvedValue({ ...request.body, id: 'pay_1', status: 'Pending' });

        await paymentController.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(201);
        expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Object) }));
    });

    it('3. POST /payments - El Controlador debe atrapar el error del UseCase y devolver 404 (Socio inexistente)', async () => {
        const request = {
            body: { member_id: '999', amount: 15000, month: 5, year: 2026, due_date: '2026-05-10' }
        } as any;
        const reply = mockReply();

        mockMemberRepository.findById.mockResolvedValue(null); // Socio falso

        await paymentController.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith({ error: 'El socio especificado no existe' });
    });

    // ==========================================
    // 4 y 5. PUT (Actualización - Éxito y Conflicto)
    // ==========================================
    it('4. PUT /payments/:id - Debe integrar la ruta dinámica y devolver 200 al actualizar', async () => {
        const request = {
            params: { id: 'pay_1' },
            body: { amount: 20000 }
        } as any;
        const reply = mockReply();

        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Pending' });
        mockPaymentRepository.update.mockResolvedValue({ id: 'pay_1', amount: 20000, status: 'Pending' });

        await paymentController.update(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({ data: expect.any(Object) });
    });

    it('5. PUT /payments/:id - El Controlador debe parsear error de inmutabilidad y devolver 409', async () => {
        const request = {
            params: { id: 'pay_1' },
            body: { status: 'Canceled' }
        } as any;
        const reply = mockReply();

        // Simulamos un pago cobrado para forzar el rechazo del PaymentValidator interno
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Paid' });

        // Como el Validator tira error genérico, mockeamos el throw esperado
        vi.spyOn(updatePaymentUseCase, 'execute').mockRejectedValueOnce(new Error('No se puede editar un pago cerrado'));

        await paymentController.update(request, reply);

        expect(reply.status).toHaveBeenCalledWith(409);
        expect(reply.send).toHaveBeenCalledWith({ error: 'No se puede editar un pago cerrado' });
    });

    // ==========================================
    // 6. DELETE (Baja lógica)
    // ==========================================
    it('6. DELETE /payments/:id - Debe integrar correctamente y devolver 204 No Content', async () => {
        const request = {
            params: { id: 'pay_1' }
        } as any;
        const reply = mockReply();

        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Pending' });
        mockPaymentRepository.updateStatus.mockResolvedValue(undefined);

        await paymentController.delete(request, reply);

        // Verifica código HTTP 204 vacío según la especificación del TDD-0015
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalledWith(); 
    });
});