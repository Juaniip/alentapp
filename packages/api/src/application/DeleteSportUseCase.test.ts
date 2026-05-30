import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportUseCase } from './DeleteSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { DeleteSportValidator } from '../domain/services/DeleteSportValidator.js';

describe('DeleteSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as SportRepository;

    const mockDeleteSportValidator = {
        validateNoActiveEnrollments: vi.fn(),
    } as unknown as DeleteSportValidator;

    const useCase = new DeleteSportUseCase(mockSportRepo, mockDeleteSportValidator);

    const existingSport = {
        id: 'sport-uuid-1',
        name: 'Fútbol',
        description: 'Descripción',
        maxCapacity: 20,
        additionalPrice: 500,
        requiresMedicalCertificate: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar un deporte exitosamente', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockDeleteSportValidator.validateNoActiveEnrollments).mockResolvedValueOnce(undefined);
        vi.mocked(mockSportRepo.delete).mockResolvedValueOnce(undefined);

        await expect(useCase.execute('sport-uuid-1')).resolves.not.toThrow();

        expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-uuid-1');
        expect(mockDeleteSportValidator.validateNoActiveEnrollments).toHaveBeenCalledWith('sport-uuid-1');
        expect(mockSportRepo.delete).toHaveBeenCalledWith('sport-uuid-1');
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('sport-uuid-1'))
            .rejects.toThrow('El deporte no existe');

        expect(mockDeleteSportValidator.validateNoActiveEnrollments).not.toHaveBeenCalled();
        expect(mockSportRepo.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el deporte tiene inscripciones activas', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockDeleteSportValidator.validateNoActiveEnrollments).mockRejectedValueOnce(
            new Error('No se puede eliminar un deporte con inscripciones activas'),
        );

        await expect(useCase.execute('sport-uuid-1'))
            .rejects.toThrow('No se puede eliminar un deporte con inscripciones activas');

        expect(mockSportRepo.delete).not.toHaveBeenCalled();
    });
});
