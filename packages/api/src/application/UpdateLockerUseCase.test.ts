import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO } from '@alentapp/shared';

describe('UpdateLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        existsByNumber: vi.fn(),
        findByMemberId: vi.fn(),
        update: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new UpdateLockerUseCase(mockLockerRepo);

    const mockExistingLocker: LockerDTO = {
        id: 'uuid-1',
        number: 1,
        location: 'Sector A',
        status: 'Available',
        member_id: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLockerRepo.findById).mockResolvedValue(mockExistingLocker);
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValue(false);
        vi.mocked(mockLockerRepo.findByMemberId).mockResolvedValue(null);
    });

    it('debe lanzar error si el casillero no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-999', { location: 'Sector Z' }))
            .rejects.toThrow('El casillero con id uuid-999 no existe');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe actualizar la ubicación exitosamente', async () => {
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({
            ...mockExistingLocker,
            location: 'Sector B',
        });

        const result = await useCase.execute('uuid-1', { location: 'Sector B' });

        expect(result.location).toBe('Sector B');
        expect(mockLockerRepo.update).toHaveBeenCalledOnce();
    });

    it('debe lanzar error si el número nuevo ya existe', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(true);

        await expect(useCase.execute('uuid-1', { number: 99 }))
            .rejects.toThrow('Ya existe un casillero con el número 99');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta asignar socio a casillero en Maintenance', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...mockExistingLocker,
            status: 'Maintenance',
        });

        await expect(useCase.execute('uuid-1', { member_id: 'member-1' }))
            .rejects.toThrow('Un casillero en mantenimiento no puede tener un socio asignado');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta poner Occupied sin socio', async () => {
        await expect(useCase.execute('uuid-1', { status: 'Occupied' }))
            .rejects.toThrow('Un casillero no puede estar Occupied sin un socio asignado');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el socio ya tiene un casillero asignado', async () => {
        vi.mocked(mockLockerRepo.findByMemberId).mockResolvedValueOnce({
            ...mockExistingLocker,
            id: 'uuid-2',
            number: 2,
            member_id: 'member-1',
        });

        await expect(useCase.execute('uuid-1', { member_id: 'member-1' }))
            .rejects.toThrow('El socio ya tiene un casillero asignado');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe cambiar status a Occupied automáticamente al asignar un socio', async () => {
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({
            ...mockExistingLocker,
            status: 'Occupied',
            member_id: 'member-1',
        });

        await useCase.execute('uuid-1', { member_id: 'member-1' });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            status: 'Occupied',
            member_id: 'member-1',
        }));
    });

    it('debe cambiar status a Available automáticamente al desasignar un socio', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...mockExistingLocker,
            status: 'Occupied',
            member_id: 'member-1',
        });

        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({
            ...mockExistingLocker,
            status: 'Available',
            member_id: null,
        });

        await useCase.execute('uuid-1', { member_id: null });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            status: 'Available',
            member_id: null,
        }));
    });
});