import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from './DeleteEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { InvalidLoanStatusError } from '../domain/errors/InvalidLoanStatusError.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('DeleteEquipmentLoanUseCase', () => {
    const mockLoanRepo: Partial<IEquipmentLoanRepository> = {
        findById: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new DeleteEquipmentLoanUseCase(
        mockLoanRepo as IEquipmentLoanRepository,
    );

    const loanLoaned: EquipmentLoanDTO = {
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
        vi.mocked(mockLoanRepo.findById!).mockResolvedValue(loanLoaned);
        vi.mocked(mockLoanRepo.delete!).mockResolvedValue(undefined);
    });

    it('debe eliminar el préstamo si está en estado Loaned', async () => {
        await useCase.execute('loan-1');

        expect(mockLoanRepo.delete).toHaveBeenCalledOnce();
        expect(mockLoanRepo.delete).toHaveBeenCalledWith('loan-1');
    });

    it('debe lanzar error si el préstamo no existe', async () => {
        vi.mocked(mockLoanRepo.findById!).mockResolvedValueOnce(null);

        await expect(useCase.execute('inexistente'))
            .rejects.toThrow('El préstamo no existe.');

        expect(mockLoanRepo.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar InvalidLoanStatusError si el préstamo está en estado Returned', async () => {
        vi.mocked(mockLoanRepo.findById!).mockResolvedValueOnce({
            ...loanLoaned,
            status: 'Returned',
        });

        await expect(useCase.execute('loan-1'))
            .rejects.toBeInstanceOf(InvalidLoanStatusError);

        expect(mockLoanRepo.delete).not.toHaveBeenCalled();
    });
});