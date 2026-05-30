import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';

describe('UpdateSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateNameNotModified: vi.fn(),
        validateMaxCapacity: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    const existingSport = {
        id: 'sport-uuid-1',
        name: 'Fútbol',
        description: 'Descripción original',
        maxCapacity: 20,
        additionalPrice: 500,
        requiresMedicalCertificate: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe actualizar un deporte exitosamente', async () => {
        const updatedSport = { ...existingSport, description: 'Nueva descripción' };
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(updatedSport);

        const result = await useCase.execute('sport-uuid-1', { description: 'Nueva descripción' });

        expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-uuid-1');
        expect(mockSportValidator.validateNameNotModified).toHaveBeenCalledWith({ description: 'Nueva descripción' });
        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-uuid-1', { description: 'Nueva descripción' });
        expect(result.description).toBe('Nueva descripción');
    });

    it('debe validar maxCapacity cuando se envía ese campo', async () => {
        const updatedSport = { ...existingSport, maxCapacity: 30 };
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(updatedSport);

        await useCase.execute('sport-uuid-1', { maxCapacity: 30 });

        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(30);
    });

    it('no debe llamar validateMaxCapacity si maxCapacity no se envía', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(existingSport);

        await useCase.execute('sport-uuid-1', { description: 'Nueva desc' });

        expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('sport-uuid-1', {}))
            .rejects.toThrow('El deporte no existe');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta modificar el nombre', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportValidator.validateNameNotModified).mockImplementationOnce(() => {
            throw new Error('El nombre del deporte no puede modificarse');
        });

        await expect(useCase.execute('sport-uuid-1', { name: 'Otro' } as any))
            .rejects.toThrow('El nombre del deporte no puede modificarse');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si maxCapacity es inválido', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportValidator.validateMaxCapacity).mockImplementationOnce(() => {
            throw new Error('El cupo máximo debe ser mayor a cero');
        });

        await expect(useCase.execute('sport-uuid-1', { maxCapacity: 0 }))
            .rejects.toThrow('El cupo máximo debe ser mayor a cero');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    // Requiere PR fix/sport-descripcion-update-vacia (PR #52)
    it('debe lanzar error si description es una cadena vacía', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);

        await expect(useCase.execute('sport-uuid-1', { description: '' }))
            .rejects.toThrow('La descripción no puede quedar vacía');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    // Requiere PR fix/sport-descripcion-update-vacia (PR #52)
    it('debe lanzar error si description contiene solo espacios en blanco', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);

        await expect(useCase.execute('sport-uuid-1', { description: '   ' }))
            .rejects.toThrow('La descripción no puede quedar vacía');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });
});
