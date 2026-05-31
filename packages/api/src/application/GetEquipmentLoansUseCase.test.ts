import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEquipmentLoansUseCase } from './GetEquipmentLoansUseCase.js';
import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('GetEquipmentLoansUseCase', () => {
    const mockLoanRepo: Partial<IEquipmentLoanRepository> = {
        findAll: vi.fn(),
    };

    const useCase = new GetEquipmentLoansUseCase(
        mockLoanRepo as IEquipmentLoanRepository,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de préstamos', async () => {
        const mockLoans: EquipmentLoanDTO[] = [
            {
                id: 'loan-1',
                itemName: 'Pelota de fútbol',
                status: 'Loaned',
                loanDate: '2026-05-01T10:00:00.000Z',
                dueDate: '2026-05-10T10:00:00.000Z',
                memberId: 'member-1',
                memberName: 'Alberto Tesorero',
            },
            {
                id: 'loan-2',
                itemName: 'Raqueta de tenis',
                status: 'Returned',
                loanDate: '2026-05-01T10:00:00.000Z',
                dueDate: '2026-05-10T10:00:00.000Z',
                memberId: 'member-2',
                memberName: 'Juan Pérez',
            },
        ];
        vi.mocked(mockLoanRepo.findAll!).mockResolvedValueOnce(mockLoans);

        const result = await useCase.execute();

        expect(result).toEqual(mockLoans);
        expect(mockLoanRepo.findAll).toHaveBeenCalledOnce();
    });

    it('debe retornar una lista vacía si no hay préstamos registrados', async () => {
        vi.mocked(mockLoanRepo.findAll!).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockLoanRepo.findAll).toHaveBeenCalledOnce();
    });
});