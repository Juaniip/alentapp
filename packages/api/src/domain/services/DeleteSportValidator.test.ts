import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportValidator } from './DeleteSportValidator.js';
import { SportRepository } from '../SportRepository.js';

describe('DeleteSportValidator', () => {
    const mockSportRepo = {
        hasActiveEnrollments: vi.fn(),
    } as unknown as SportRepository;

    const validator = new DeleteSportValidator(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe pasar si el deporte no tiene inscripciones activas', async () => {
        vi.mocked(mockSportRepo.hasActiveEnrollments).mockResolvedValueOnce(false);

        await expect(validator.validateNoActiveEnrollments('sport-uuid-1'))
            .resolves.not.toThrow();

        expect(mockSportRepo.hasActiveEnrollments).toHaveBeenCalledWith('sport-uuid-1');
    });

    it('debe lanzar error si el deporte tiene inscripciones activas', async () => {
        vi.mocked(mockSportRepo.hasActiveEnrollments).mockResolvedValueOnce(true);

        await expect(validator.validateNoActiveEnrollments('sport-uuid-1'))
            .rejects.toThrow('No se puede eliminar un deporte con inscripciones activas');
    });
});
