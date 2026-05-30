import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './CreateEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { EquipmentLoanDTO, MemberDTO } from '@alentapp/shared';

describe('CreateEquipmentLoanUseCase', () => {
    const mockLoanRepo: Partial<IEquipmentLoanRepository> = {
        create: vi.fn(),
    };

    const mockMemberRepo: Partial<MemberRepository> = {
        findById: vi.fn(),
    };

    const useCase = new CreateEquipmentLoanUseCase(
        mockLoanRepo as IEquipmentLoanRepository,
        mockMemberRepo as MemberRepository,
    );

    const memberPleno: MemberDTO = {
        id: 'member-1',
        dni: '12345678',
        name: 'Alberto Tesorero',
        email: 'alberto@club.com',
        birthdate: '1985-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-01-01T00:00:00.000Z',
    };

    const memberCadete: MemberDTO = { ...memberPleno, id: 'member-2', category: 'Cadete' };

    const futureDueDate = new Date(Date.now() + 86400000 * 7).toISOString();
    const pastDueDate = new Date(Date.now() - 86400000).toISOString();

    const mockCreatedLoan: EquipmentLoanDTO = {
        id: 'loan-1',
        itemName: 'Pelota de fútbol',
        status: 'Loaned',
        loanDate: new Date().toISOString(),
        dueDate: futureDueDate,
        memberId: 'member-1',
        memberName: 'Alberto Tesorero',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockMemberRepo.findById!).mockResolvedValue(memberPleno);
        vi.mocked(mockLoanRepo.create!).mockResolvedValue(mockCreatedLoan);
    });

    it('debe crear el préstamo exitosamente para un socio Pleno', async () => {
        const result = await useCase.execute({
            itemName: 'Pelota de fútbol',
            dueDate: futureDueDate,
            memberId: 'member-1',
        });

        expect(mockLoanRepo.create).toHaveBeenCalledOnce();
        expect(result.status).toBe('Loaned');
        expect(result.itemName).toBe('Pelota de fútbol');
    });

    it('debe lanzar error si itemName está vacío', async () => {
        await expect(
            useCase.execute({ itemName: '', dueDate: futureDueDate, memberId: 'member-1' })
        ).rejects.toThrow('El nombre del ítem es requerido.');

        expect(mockLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById!).mockResolvedValueOnce(null);

        await expect(
            useCase.execute({ itemName: 'Pelota', dueDate: futureDueDate, memberId: 'inexistente' })
        ).rejects.toThrow('El socio no existe.');

        expect(mockLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el socio es Cadete', async () => {
        vi.mocked(mockMemberRepo.findById!).mockResolvedValueOnce(memberCadete);

        await expect(
            useCase.execute({ itemName: 'Pelota', dueDate: futureDueDate, memberId: 'member-2' })
        ).rejects.toThrow('Los socios Cadete no pueden solicitar equipamiento.');

        expect(mockLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si dueDate es anterior a la fecha actual', async () => {
        await expect(
            useCase.execute({ itemName: 'Pelota', dueDate: pastDueDate, memberId: 'member-1' })
        ).rejects.toThrow('La fecha de devolución debe ser posterior a la de préstamo.');

        expect(mockLoanRepo.create).not.toHaveBeenCalled();
    });
});