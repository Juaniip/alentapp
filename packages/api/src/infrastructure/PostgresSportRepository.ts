import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBSport = {
    id: string;
    name: string;
    description: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
};

export class PostgresSportRepository implements SportRepository {
    async create(data: CreateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.create({
            data: {
                name: data.name,
                description: data.description,
                max_capacity: data.maxCapacity,
                additional_price: data.additionalPrice,
                requires_medical_certificate: data.requiresMedicalCertificate,
            },
        });

        return this.mapToDTO(sport);
    }

    async findByName(name: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.update({
            where: { id },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.maxCapacity !== undefined && { max_capacity: data.maxCapacity }),
                ...(data.additionalPrice !== undefined && { additional_price: data.additionalPrice }),
                ...(data.requiresMedicalCertificate !== undefined && { requires_medical_certificate: data.requiresMedicalCertificate }),
            },
        });

        return this.mapToDTO(sport);
    }

    async delete(id: string): Promise<void> {
        await prisma.sport.delete({
            where: { id },
        });
    }

    async findAll(): Promise<SportDTO[]> {
        const sports = await prisma.sport.findMany({
            orderBy: { name: 'asc' },
        });
        return sports.map(sport => this.mapToDTO(sport));
    }

    async hasActiveEnrollments(sportId: string): Promise<boolean> {
        // TODO: Implement when Enrollment model is created
        // For now, returns false as placeholder
        return false;
    }

    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.max_capacity,
            additionalPrice: sport.additional_price,
            requiresMedicalCertificate: sport.requires_medical_certificate,
        };
    }
}