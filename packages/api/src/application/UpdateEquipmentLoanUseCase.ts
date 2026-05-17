import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export class UpdateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
    ) {}

    async execute(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        // 1. Verificar que el préstamo existe
        const existingLoan = await this.equipmentLoanRepository.findById(id);
        if (!existingLoan) {
            throw new Error('El préstamo no existe.');
        }

        // 2. Validar campos inmutables (el body NO debe traer memberId ni loanDate)
        const body = data as Record<string, unknown>;
        if ('memberId' in body) {
            throw new Error('El campo memberId no puede ser modificado.');
        }
        if ('loanDate' in body) {
            throw new Error('El campo loanDate no puede ser modificado.');
        }

        // 3. Validar transición de estado: no se puede volver a 'Loaned'
        if (data.status === 'Loaned' as string) {
            throw new Error("No se puede revertir el estado a 'Loaned'.");
        }

        // 4. Validar que status solo sea Returned o Damaged si se envía
        if (data.status && !['Returned', 'Damaged'].includes(data.status)) {
            throw new Error("El estado debe ser 'Returned' o 'Damaged'.");
        }

        // 5. Validar itemName no vacío si se envía
        if (data.itemName !== undefined && data.itemName.trim() === '') {
            throw new Error('El nombre del ítem no puede estar vacío.');
        }

        // 6. Validar dueDate > loanDate original si se envía
        if (data.dueDate !== undefined) {
            const originalLoanDate = new Date(existingLoan.loanDate);
            const newDueDate = new Date(data.dueDate);
            if (isNaN(newDueDate.getTime()) || newDueDate <= originalLoanDate) {
                throw new Error('La fecha de devolución debe ser posterior a la de préstamo.');
            }
        }

        // 7. Persistir
        return this.equipmentLoanRepository.update(id, data);
    }
}