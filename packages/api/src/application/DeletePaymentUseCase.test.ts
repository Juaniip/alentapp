import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelPaymentUseCase } from './DeletePaymentUseCase.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

vi.mock('../domain/services/PaymentValidator.js', () => ({
    PaymentValidator: {
        canCancel: vi.fn(),
    }
}));

describe('CancelPaymentUseCase - TDD-0015', () => {
    const mockPaymentRepository = {
        findById: vi.fn(),
        updateStatus: vi.fn(),
    };

    const useCase = new CancelPaymentUseCase(mockPaymentRepository as any);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('9. Debe realizar una baja lógica actualizando el estado a "Canceled"', async () => {
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Pending' });
        mockPaymentRepository.updateStatus.mockResolvedValue(undefined);

        await useCase.execute('pay_1');

        expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('pay_1', 'Canceled');
    });

    it('10. Debe lanzar error 404 si se intenta anular un pago inexistente', async () => {
        mockPaymentRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute('inválido')).rejects.toThrow('El pago no existe');
    });

    it('11. Debe verificar usando PaymentValidator que el estado permita la anulación', async () => {
        mockPaymentRepository.findById.mockResolvedValue({ id: 'pay_1', status: 'Paid' });

        await useCase.execute('pay_1').catch(() => {});

        expect(PaymentValidator.canCancel).toHaveBeenCalledWith('Paid');
    });
});