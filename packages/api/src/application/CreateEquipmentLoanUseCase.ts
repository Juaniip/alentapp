import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { CreateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export class CreateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: IEquipmentLoanRepository,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        // 1. Validar que itemName no esté vacío
        if (!data.itemName || data.itemName.trim() === '') {
            throw new Error('El nombre del ítem es requerido.');
        }

        // 2. Buscar el socio
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio no existe.');
        }

        // 3. Validar categoría del socio (regla de negocio de dominio)
        if (member.category === 'Cadete') {
            throw new Error('Los socios Cadete no pueden solicitar equipamiento.');
        }

        // 4. Validar dueDate > NOW()
        const now = new Date();
        const dueDate = new Date(data.dueDate);
        if (isNaN(dueDate.getTime()) || dueDate <= now) {
            throw new Error('La fecha de devolución debe ser posterior a la de préstamo.');
        }

        // 5. Persistir
        return this.equipmentLoanRepository.create(data);
    }
}