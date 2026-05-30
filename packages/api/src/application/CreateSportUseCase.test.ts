import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './CreateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
    const mockSportRepo = {
        findByName: vi.fn(),
        create: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new CreateSportUseCase(mockSportRepo);

    const validRequest: CreateSportRequest = {
        name: 'Fútbol',
        description: 'El deporte más popular del mundo',
        maxCapacity: 20,
        additionalPrice: 500,
        requiresMedicalCertificate: false,
    };

    const mockCreatedSport = {
        id: 'sport-uuid-1',
        name: 'Fútbol',
        description: 'El deporte más popular del mundo',
        maxCapacity: 20,
        additionalPrice: 500,
        requiresMedicalCertificate: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte exitosamente con datos válidos', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce(mockCreatedSport);

        const result = await useCase.execute(validRequest);

        expect(mockSportRepo.findByName).toHaveBeenCalledWith('Fútbol');
        expect(mockSportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Fútbol',
            description: 'El deporte más popular del mundo',
            maxCapacity: 20,
        }));
        expect(result.id).toBe('sport-uuid-1');
        expect(result.name).toBe('Fútbol');
    });

    it('debe aplicar trim al nombre y descripción antes de persistir', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce(mockCreatedSport);

        await useCase.execute({
            ...validRequest,
            name: '  Fútbol  ',
            description: '  El deporte más popular  ',
        });

        expect(mockSportRepo.findByName).toHaveBeenCalledWith('Fútbol');
        expect(mockSportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Fútbol',
            description: 'El deporte más popular',
        }));
    });

    it('debe lanzar error si ya existe un deporte con ese nombre', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(mockCreatedSport);

        await expect(useCase.execute(validRequest))
            .rejects.toThrow('Ya existe un deporte con ese nombre');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el nombre está vacío', async () => {
        await expect(useCase.execute({ ...validRequest, name: '' }))
            .rejects.toThrow('Faltan campos requeridos');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si la descripción está vacía', async () => {
        await expect(useCase.execute({ ...validRequest, description: '' }))
            .rejects.toThrow('Faltan campos requeridos');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    // Requiere PR fix/sport-validaciones-creacion (PR #48)
    it('debe lanzar error si el nombre contiene solo espacios en blanco', async () => {
        await expect(useCase.execute({ ...validRequest, name: '   ' }))
            .rejects.toThrow('Faltan campos requeridos');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    // Requiere PR fix/sport-validaciones-creacion (PR #48)
    it('debe lanzar error si la descripción contiene solo espacios en blanco', async () => {
        await expect(useCase.execute({ ...validRequest, description: '   ' }))
            .rejects.toThrow('Faltan campos requeridos');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si maxCapacity es cero', async () => {
        await expect(useCase.execute({ ...validRequest, maxCapacity: 0 }))
            .rejects.toThrow('El cupo máximo debe ser mayor a cero');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si maxCapacity es negativo', async () => {
        await expect(useCase.execute({ ...validRequest, maxCapacity: -5 }))
            .rejects.toThrow('El cupo máximo debe ser mayor a cero');
    });

    it('debe lanzar error si maxCapacity no es entero', async () => {
        await expect(useCase.execute({ ...validRequest, maxCapacity: 1.5 }))
            .rejects.toThrow('El cupo máximo debe ser mayor a cero');
    });

    // Requiere PR fix/sport-validaciones-creacion (PR #48)
    it('debe lanzar error si additionalPrice es negativo', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);

        await expect(useCase.execute({ ...validRequest, additionalPrice: -1 }))
            .rejects.toThrow('El precio adicional no puede ser negativo');

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe permitir additionalPrice igual a cero', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({ ...mockCreatedSport, additionalPrice: 0 });

        await expect(useCase.execute({ ...validRequest, additionalPrice: 0 }))
            .resolves.not.toThrow();
    });
});
