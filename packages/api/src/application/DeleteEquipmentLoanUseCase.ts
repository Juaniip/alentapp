import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

export class DeleteEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const loan = await this.equipmentLoanRepository.findById(id);
        if (!loan) {
            throw new Error('El préstamo no existe.');
        }

        // VALIDACIÓN: solo se pueden borrar préstamos en estado Loaned
        if (loan.status !== 'Loaned') {
            throw new Error('Solo se pueden eliminar préstamos en estado Loaned.');
        }

        await this.equipmentLoanRepository.delete(id);
    }
}