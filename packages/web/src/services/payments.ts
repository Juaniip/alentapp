import type { PaymentDTO, CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const paymentsService = {
    async getAll(): Promise<PaymentDTO[]> {
        const response = await fetch(`${API_URL}/payments`);
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Error al obtener pagos');
            return json.data;
    },

    async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
        const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Error al crear pago');
            return json.data;
    },

    async update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
        const response = await fetch(`${API_URL}/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Error al actualizar pago');
            return json.data;
    },

    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/payments/${id}`, {
        method: 'DELETE',
    });
        if (!response.ok) {
            const json = await response.json();
            throw new Error(json.error || 'Error al anular pago');
        }
    }
};