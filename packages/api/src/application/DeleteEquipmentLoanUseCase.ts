import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { InvalidLoanStatusError } from '../domain/errors/InvalidLoanStatusError.js';

export class DeleteEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const loan = await this.equipmentLoanRepository.findById(id);
        if (!loan) {
            throw new Error('El préstamo no existe.');
        }

        // Solo los préstamos en estado Loaned pueden eliminarse
        // para preservar la auditoría de devoluciones y daños.
        if (loan.status !== 'Loaned') {
            throw new InvalidLoanStatusError('Solo se pueden eliminar préstamos en estado Loaned.');
        }

        await this.equipmentLoanRepository.delete(id);
    }
}