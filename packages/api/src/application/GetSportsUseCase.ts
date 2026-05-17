import { PostgresSportRepository } from '../infrastructure/PostgresSportRepository.js';
import { SportDTO } from '@alentapp/shared';

export class GetSportsUseCase {
    constructor(private readonly sportRepository: PostgresSportRepository) {}

    async execute(): Promise<SportDTO[]> {
        return this.sportRepository.findAll();
    }
}
