import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLockerUseCase } from './CreateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('CreateLockerUseCase', () => {
    const mockLockerRepo = {
        existsByNumber: vi.fn(),
        save: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new CreateLockerUseCase(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un casillero exitosamente con estado Available', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(false);
        vi.mocked(mockLockerRepo.save).mockResolvedValueOnce({
            id: 'uuid-1',
            number: 1,
            location: 'Sector A',
            status: 'Available',
            member_id: null,
        });

        const result = await useCase.execute({
            number: 1,
            location: 'Sector A',
            status: 'Available',
        });

        expect(result.id).toBe('uuid-1');
        expect(result.status).toBe('Available');
        expect(result.member_id).toBeNull();
        expect(mockLockerRepo.save).toHaveBeenCalledOnce();
    });

    it('debe crear un casillero exitosamente con estado Maintenance', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(false);
        vi.mocked(mockLockerRepo.save).mockResolvedValueOnce({
            id: 'uuid-2',
            number: 2,
            location: 'Sector B',
            status: 'Maintenance',
            member_id: null,
        });

        const result = await useCase.execute({
            number: 2,
            location: 'Sector B',
            status: 'Maintenance',
        });

        expect(result.status).toBe('Maintenance');
        expect(result.member_id).toBeNull();
    });

    it('debe lanzar error si el número de casillero ya existe', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(true);

        await expect(useCase.execute({
            number: 1,
            location: 'Sector A',
            status: 'Available',
        })).rejects.toThrow('Ya existe un casillero con el número 1');

        expect(mockLockerRepo.save).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el número es negativo', async () => {
        await expect(useCase.execute({
            number: -1,
            location: 'Sector A',
            status: 'Available',
        })).rejects.toThrow('El número de casillero debe ser un entero positivo');

        expect(mockLockerRepo.save).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el número es cero', async () => {
        await expect(useCase.execute({
            number: 0,
            location: 'Sector A',
            status: 'Available',
        })).rejects.toThrow('El número de casillero debe ser un entero positivo');

        expect(mockLockerRepo.save).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el número es nulo', async () => {
        await expect(useCase.execute({
            number: null as any,
            location: 'Sector A',
            status: 'Available',
        })).rejects.toThrow('El número de casillero es obligatorio');

        expect(mockLockerRepo.save).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el estado es inválido', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(false);

        await expect(useCase.execute({
            number: 3,
            location: 'Sector C',
            status: 'Occupied' as any,
        })).rejects.toThrow('Estado inválido');

        expect(mockLockerRepo.save).not.toHaveBeenCalled();
    });

    it('debe garantizar que member_id sea nulo al crear', async () => {
        vi.mocked(mockLockerRepo.existsByNumber).mockResolvedValueOnce(false);
        vi.mocked(mockLockerRepo.save).mockResolvedValueOnce({
            id: 'uuid-3',
            number: 3,
            location: 'Sector C',
            status: 'Available',
            member_id: null,
        });

        const result = await useCase.execute({
            number: 3,
            location: 'Sector C',
            status: 'Available',
        });

        expect(result.member_id).toBeNull();
    });
});