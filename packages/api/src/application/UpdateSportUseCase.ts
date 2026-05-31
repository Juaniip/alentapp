import { UpdateSportRequest, SportDTO } from '@alentapp/shared';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';

export class UpdateSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
        private readonly sportValidator: SportValidator,
    ) {}

    async execute(id: string, data: UpdateSportRequest & { name?: string }): Promise<SportDTO> {
        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('El deporte no existe');
        }

        this.sportValidator.validateNameNotModified(data);

        if (data.maxCapacity !== undefined) {
            this.sportValidator.validateMaxCapacity(data.maxCapacity);
        }

        if (data.additionalPrice !== undefined && data.additionalPrice < 0) {
            throw new Error('El precio adicional no puede ser negativo');
        }

        if (data.description !== undefined && data.description.trim() === '') {
            throw new Error('La descripción no puede quedar vacía');
        }

        return this.sportRepository.update(id, {
            ...data,
            ...(data.description !== undefined && { description: data.description.trim() }),
        });
    }
}
