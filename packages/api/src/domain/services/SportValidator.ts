import { UpdateSportRequest } from '@alentapp/shared';

export class SportValidator {

    validateMaxCapacity(maxCapacity: number): void {
        if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
            throw new Error('El cupo máximo debe ser mayor a cero');
        }
    }

    validateNameNotModified(updateData: UpdateSportRequest & { name?: string }): void {
        if ('name' in updateData && updateData.name !== undefined) {
            throw new Error('El nombre del deporte no puede modificarse');
        }
    }
}
