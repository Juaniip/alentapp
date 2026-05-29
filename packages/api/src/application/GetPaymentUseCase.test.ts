import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetPaymentsUseCase } from './GetPaymentsUseCase.js';

describe('GetPaymentsUseCase', () => {
    const mockPaymentRepository = {
        findAll: vi.fn(),
    };

    const useCase = new GetPaymentsUseCase(mockPaymentRepository as any);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('12. Debe devolver una lista con todos los pagos registrados', async () => {
        const fakePayments = [{ id: '1' }, { id: '2' }];
        mockPaymentRepository.findAll.mockResolvedValue(fakePayments);

        const result = await useCase.execute();

        expect(result.length).toBe(2);
        expect(mockPaymentRepository.findAll).toHaveBeenCalled();
    });
});