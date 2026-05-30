import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

describe('GetSportsUseCase', () => {
    const mockSportRepo = {
        findAll: vi.fn(),
    } as unknown as SportRepository;

    // Requiere PR fix/sport-getsports-dependencia-interfaz: actualmente el constructor acepta PostgresSportRepository
    const useCase = new GetSportsUseCase(mockSportRepo as any);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de deportes', async () => {
        const sports: SportDTO[] = [
            { id: 'uuid-1', name: 'Fútbol', description: 'Desc', maxCapacity: 20, additionalPrice: 0, requiresMedicalCertificate: false },
            { id: 'uuid-2', name: 'Tenis', description: 'Desc', maxCapacity: 10, additionalPrice: 100, requiresMedicalCertificate: false },
        ];
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce(sports);

        const result = await useCase.execute();

        expect(mockSportRepo.findAll).toHaveBeenCalledOnce();
        expect(result).toEqual(sports);
    });

    it('debe retornar un array vacío si no hay deportes', async () => {
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });
});
