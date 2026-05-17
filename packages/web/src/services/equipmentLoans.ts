import type {
  EquipmentLoanDTO,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
} from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const equipmentLoansService = {
  async getAll(): Promise<EquipmentLoanDTO[]> {
    const response = await fetch(`${API_URL}/equipment-loans`);
    if (!response.ok) {
      throw new Error('Error al obtener los préstamos de equipamiento');
    }
    const result = await response.json();
    return result.data;
  },

  async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
    const response = await fetch(`${API_URL}/equipment-loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al registrar el préstamo');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
    const response = await fetch(`${API_URL}/equipment-loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el préstamo');
    }
    const result = await response.json();
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/equipment-loans/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el préstamo');
    }
  },
};