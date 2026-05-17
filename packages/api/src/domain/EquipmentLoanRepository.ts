import {
  EquipmentLoanDTO,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
} from '@alentapp/shared';

export interface IEquipmentLoanRepository {
  create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
  findById(id: string): Promise<EquipmentLoanDTO | null>;
  findAll(): Promise<EquipmentLoanDTO[]>;
  update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
  delete(id: string): Promise<void>;
}