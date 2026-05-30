import { CreateSportRequest, SportDTO } from '@alentapp/shared';
import { SportRepository } from '../domain/SportRepository.js';

export class CreateSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
    ) {}

    async execute(data: CreateSportRequest): Promise<SportDTO> {
        if (!data.name?.trim() || !data.description?.trim()) {
            throw new Error('Faltan campos requeridos');
        }

        if (!Number.isInteger(data.maxCapacity) || data.maxCapacity <= 0) {
            throw new Error('El cupo máximo debe ser mayor a cero');
        }

        const existingSport = await this.sportRepository.findByName(data.name.trim());
        if (existingSport) {
            throw new Error('Ya existe un deporte con ese nombre');
        }

        return this.sportRepository.create({
            ...data,
            name: data.name.trim(),
            description: data.description.trim(),
        });
    }
}