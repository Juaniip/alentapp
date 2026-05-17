import { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

export interface SportRepository {
    create(data: CreateSportRequest): Promise<SportDTO>;
    findByName(name: string): Promise<SportDTO | null>;
    findById(id: string): Promise<SportDTO | null>;
    findAll(): Promise<SportDTO[]>;
    update(id: string, data: UpdateSportRequest): Promise<SportDTO>;
    delete(id: string): Promise<void>;
    hasActiveEnrollments(sportId: string): Promise<boolean>;
}