import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

export class GetEquipmentLoansUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
    ) {}

    async execute(): Promise<EquipmentLoanDTO[]> {
        return this.equipmentLoanRepository.findAll();
    }
}