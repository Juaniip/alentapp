import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

vi.mock('../domain/services/PaymentValidator.js', () => ({
    PaymentValidator: {
        validateAmount: vi.fn(),
        canEdit: vi.fn(),
    }
}));

describe('UpdatePaymentUseCase - TDD-0014', () => {
    const mockPaymentRepository = {
        findById: vi.fn(),
        update: vi.fn(),
    };

    const useCase = new UpdatePaymentUseCase(mockPaymentRepository as any);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('5. Debe actualizar un pago existente correctamente', async () => {
        const req = { amount: 20000 };
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Pending' });
        mockPaymentRepository.update.mockResolvedValue({ id: 'pay_1', amount: 20000, status: 'Pending' });

        const result = await useCase.execute('pay_1', req);

        expect(result.amount).toBe(20000);
        expect(mockPaymentRepository.update).toHaveBeenCalledWith('pay_1', req);
    });

    it('6. Debe lanzar error 404 si el pago a editar no existe', async () => {
        mockPaymentRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute('inválido', {} as any)).rejects.toThrow('El pago no existe');
    });

    it('7. Debe validar la inmutabilidad de estados cerrados usando PaymentValidator', async () => {
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Paid' });
        
        await useCase.execute('pay_1', { status: 'Canceled' } as any).catch(() => {});

        expect(PaymentValidator.canEdit).toHaveBeenCalledWith('Paid');
    });

    it('8. Debe validar el nuevo monto si es enviado en la petición', async () => {
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Pending' });
        
        await useCase.execute('pay_1', { amount: 25000 } as any);

        expect(PaymentValidator.validateAmount).toHaveBeenCalledWith(25000);
    });
});