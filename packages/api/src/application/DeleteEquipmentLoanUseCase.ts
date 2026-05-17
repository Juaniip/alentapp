import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

export class DeleteEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
    ) {}

    async execute(id: string): Promise<void> {
        // 1. Verificar que el préstamo existe antes de intentar borrarlo
        const existingLoan = await this.equipmentLoanRepository.findById(id);
        if (!existingLoan) {
            throw new Error('El préstamo no existe.');
        }

        // 2. Borrado físico (hard delete)
        await this.equipmentLoanRepository.delete(id);
    }
}