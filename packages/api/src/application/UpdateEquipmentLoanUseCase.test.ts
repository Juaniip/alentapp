import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from './UpdateEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('UpdateEquipmentLoanUseCase', () => {
    const mockLoanRepo: Partial<IEquipmentLoanRepository> = {
        findById: vi.fn(),
        update: vi.fn(),
    };

    const useCase = new UpdateEquipmentLoanUseCase(
        mockLoanRepo as IEquipmentLoanRepository,
    );

    const existingLoan: EquipmentLoanDTO = {
        id: 'loan-1',
        itemName: 'Pelota de fútbol',
        status: 'Loaned',
        loanDate: '2026-05-01T10:00:00.000Z',
        dueDate: '2026-05-10T10:00:00.000Z',
        memberId: 'member-1',
        memberName: 'Alberto Tesorero',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLoanRepo.findById!).mockResolvedValue(existingLoan);
        vi.mocked(mockLoanRepo.update!).mockResolvedValue(existingLoan);
    });

    it('debe actualizar el estado a Returned correctamente', async () => {
        vi.mocked(mockLoanRepo.update!).mockResolvedValueOnce({
            ...existingLoan,
            status: 'Returned',
        });

        const result = await useCase.execute('loan-1', { status: 'Returned' });

        expect(mockLoanRepo.update).toHaveBeenCalledWith('loan-1', { status: 'Returned' });
        expect(result.status).toBe('Returned');
    });

    it('debe lanzar error si el préstamo no existe', async () => {
        vi.mocked(mockLoanRepo.findById!).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('inexistente', { status: 'Returned' })
        ).rejects.toThrow('El préstamo no existe.');

        expect(mockLoanRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta modificar memberId', async () => {
        await expect(
            useCase.execute('loan-1', { memberId: 'otro-id' } as never)
        ).rejects.toThrow('El campo memberId no puede ser modificado.');

        expect(mockLoanRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error al intentar revertir estado a Loaned', async () => {
        await expect(
            useCase.execute('loan-1', { status: 'Loaned' as never })
        ).rejects.toThrow("No se puede revertir el estado a 'Loaned'.");

        expect(mockLoanRepo.update).not.toHaveBeenCalled();
    });
});
