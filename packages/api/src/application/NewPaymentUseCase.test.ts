import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatePaymentUseCase } from './NewPaymentUseCase.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

// En Vitest usamos vi.mock en lugar de jest.mock
vi.mock('../domain/services/PaymentValidator.js', () => ({
    PaymentValidator: {
        validateAmount: vi.fn(),
    }
}));

describe('CreatePaymentUseCase - TDD-0013', () => {
    const mockPaymentRepository = { create: vi.fn() };
    const mockMemberRepository = { findById: vi.fn() };

    const useCase = new CreatePaymentUseCase(mockPaymentRepository as any, mockMemberRepository as any);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Debe crear un pago exitosamente (status "Pending" por defecto)', async () => {
        const req = { member_id: '123', amount: 15000, month: 5, year: 2026, due_date: '2026-05-10' };
        mockMemberRepository.findById.mockResolvedValue({ id: '123' });
        mockPaymentRepository.create.mockResolvedValue({ ...req, id: 'pay_1', status: 'Pending' });

        const result = await useCase.execute(req as any);

        expect(result.status).toBe('Pending');
        expect(mockPaymentRepository.create).toHaveBeenCalledWith(req);
    });

    it('2. Debe lanzar error 400 si faltan campos obligatorios', async () => {
        const req = { member_id: '123', amount: 15000 }; 
        
        await expect(useCase.execute(req as any)).rejects.toThrow('Faltan campos obligatorios');
    });

    it('3. Debe lanzar error 404 si el socio especificado no existe', async () => {
        const req = { member_id: '999', amount: 15000, month: 5, year: 2026, due_date: '2026-05-10' };
        mockMemberRepository.findById.mockResolvedValue(null); 

        await expect(useCase.execute(req as any)).rejects.toThrow('El socio especificado no existe');
    });

    it('4. Debe utilizar PaymentValidator para verificar que el monto sea positivo', async () => {
        const req = { member_id: '123', amount: -500, month: 5, year: 2026, due_date: '2026-05-10' };
        mockMemberRepository.findById.mockResolvedValue({ id: '123' });
        
        await useCase.execute(req as any).catch(() => {});
        
        expect(PaymentValidator.validateAmount).toHaveBeenCalledWith(-500);
    });
});