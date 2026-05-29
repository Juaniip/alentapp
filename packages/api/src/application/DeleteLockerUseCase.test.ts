import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('DeleteLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new DeleteLockerUseCase(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el casillero no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-999'))
            .rejects.toThrow('El casillero con id uuid-999 no existe');

        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el casillero está ocupado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            id: 'uuid-1',
            number: 1,
            location: 'Sector A',
            status: 'Occupied',
            member_id: 'member-1',
        } as any);

        await expect(useCase.execute('uuid-1'))
            .rejects.toThrow('No se puede eliminar un casillero que está actualmente asignado a un socio');

        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el casillero si existe y está disponible', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            id: 'uuid-1',
            number: 1,
            location: 'Sector A',
            status: 'Available',
            member_id: null,
        } as any);

        await useCase.execute('uuid-1');

        expect(mockLockerRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('debe eliminar el casillero si está en Maintenance', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            id: 'uuid-1',
            number: 1,
            location: 'Sector A',
            status: 'Maintenance',
            member_id: null,
        } as any);

        await useCase.execute('uuid-1');

        expect(mockLockerRepo.delete).toHaveBeenCalledWith('uuid-1');
    });
});