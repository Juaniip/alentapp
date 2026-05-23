import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetLockersUseCase } from './GetLockersUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('GetLockersUseCase', () => {
    const mockLockerRepo = {
        findAll: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new GetLockersUseCase(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de casilleros', async () => {
        const mockLockers = [
            { id: 'uuid-1', number: 1, location: 'Sector A', status: 'Available', member_id: null },
            { id: 'uuid-2', number: 2, location: 'Sector B', status: 'Occupied', member_id: 'member-1' },
        ];
        vi.mocked(mockLockerRepo.findAll).mockResolvedValueOnce(mockLockers as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockLockers);
        expect(mockLockerRepo.findAll).toHaveBeenCalledOnce();
    });

    it('debe retornar una lista vacía si no hay casilleros', async () => {
        vi.mocked(mockLockerRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockLockerRepo.findAll).toHaveBeenCalledOnce();
    });
});