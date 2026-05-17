import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { IEquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import {
  EquipmentLoanDTO,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
} from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBEquipmentLoan = {
    id: string;
    itemName: string;
    status: 'Loaned' | 'Returned' | 'Damaged';
    loanDate: Date;
    dueDate: Date;
    memberId: string;
};

export class PrismaEquipmentLoanRepository implements IEquipmentLoanRepository {
    async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const loan = await prisma.equipmentLoan.create({
            data: {
                itemName: data.itemName.trim(),
                dueDate: new Date(data.dueDate),
                memberId: data.memberId,
            },
        });

        return this.mapToDTO(loan);
    }

    async findById(id: string): Promise<EquipmentLoanDTO | null> {
        const loan = await prisma.equipmentLoan.findUnique({
            where: { id },
        });

        return loan ? this.mapToDTO(loan) : null;
    }

    async findAll(): Promise<EquipmentLoanDTO[]> {
        const loans = await prisma.equipmentLoan.findMany({
            orderBy: { loanDate: 'desc' },
        });

        return loans.map((loan) => this.mapToDTO(loan));
    }

    async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const loan = await prisma.equipmentLoan.update({
            where: { id },
            data: {
                ...(data.itemName !== undefined && { itemName: data.itemName.trim() }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
            },
        });

        return this.mapToDTO(loan);
    }

    async delete(id: string): Promise<void> {
        await prisma.equipmentLoan.delete({
            where: { id },
        });
    }

    private mapToDTO(loan: DBEquipmentLoan): EquipmentLoanDTO {
        return {
            id: loan.id,
            itemName: loan.itemName,
            status: loan.status,
            loanDate: loan.loanDate.toISOString(),
            dueDate: loan.dueDate.toISOString(),
            memberId: loan.memberId,
        };
    }
}