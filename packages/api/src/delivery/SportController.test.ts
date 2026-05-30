import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportController } from './SportController.js';
import { CreateSportUseCase } from '../application/CreateSportUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('SportController', () => {
    const mockCreateUseCase = { execute: vi.fn() } as unknown as CreateSportUseCase;
    const mockUpdateUseCase = { execute: vi.fn() } as unknown as UpdateSportUseCase;
    const mockDeleteUseCase = { execute: vi.fn() } as unknown as DeleteSportUseCase;
    const mockGetUseCase = { execute: vi.fn() } as unknown as GetSportsUseCase;

    const controller = new SportController(mockCreateUseCase, mockUpdateUseCase, mockDeleteUseCase, mockGetUseCase);

    let mockReply: FastifyReply;

    beforeEach(() => {
        vi.clearAllMocks();
        mockReply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        } as unknown as FastifyReply;
    });

    describe('getAll', () => {
        it('debe retornar 200 con la lista de deportes', async () => {
            const sports = [{ id: '1', name: 'Fútbol', description: 'Desc', maxCapacity: 20, additionalPrice: 0, requiresMedicalCertificate: false }];
            vi.mocked(mockGetUseCase.execute).mockResolvedValueOnce(sports);

            await controller.getAll({} as FastifyRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: sports });
        });

        it('debe retornar 500 si el caso de uso lanza un error', async () => {
            vi.mocked(mockGetUseCase.execute).mockRejectedValueOnce(new Error('DB error'));

            await controller.getAll({} as FastifyRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('create', () => {
        const createRequest = {
            body: {
                name: 'Fútbol',
                description: 'Descripción',
                maxCapacity: 20,
                additionalPrice: 0,
                requiresMedicalCertificate: false,
            },
        } as FastifyRequest<any>;

        it('debe retornar 201 con el deporte creado', async () => {
            const sport = { id: 'uuid-1', ...createRequest.body };
            vi.mocked(mockCreateUseCase.execute).mockResolvedValueOnce(sport as any);

            await controller.create(createRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: sport });
        });

        it('debe retornar 409 si el nombre ya existe', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(
                new Error('Ya existe un deporte con ese nombre'),
            );

            await controller.create(createRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un deporte con ese nombre' });
        });

        it('debe retornar 400 si faltan campos requeridos', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(
                new Error('Faltan campos requeridos'),
            );

            await controller.create(createRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe retornar 400 si maxCapacity es inválido', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(
                new Error('El cupo máximo debe ser mayor a cero'),
            );

            await controller.create(createRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe retornar 500 para errores desconocidos', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(new Error('DB error'));

            await controller.create(createRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
        });
    });

    describe('update', () => {
        const updateRequest = {
            params: { id: 'sport-uuid-1' },
            body: { description: 'Nueva descripción' },
        } as FastifyRequest<any>;

        it('debe retornar 200 con el deporte actualizado', async () => {
            const sport = { id: 'sport-uuid-1', name: 'Fútbol', description: 'Nueva descripción', maxCapacity: 20, additionalPrice: 0, requiresMedicalCertificate: false };
            vi.mocked(mockUpdateUseCase.execute).mockResolvedValueOnce(sport);

            await controller.update(updateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: sport });
        });

        // Requiere PR fix/sport-http-404-recurso-no-encontrado (PR #51)
        it('debe retornar 404 si el deporte no existe', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('El deporte no existe'),
            );

            await controller.update(updateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
        });

        it('debe retornar 400 si se intenta modificar el nombre', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('El nombre del deporte no puede modificarse'),
            );

            await controller.update(updateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe retornar 400 si maxCapacity es inválido', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('El cupo máximo debe ser mayor a cero'),
            );

            await controller.update(updateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe retornar 500 para errores desconocidos', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(new Error('DB error'));

            await controller.update(updateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
        });
    });

    describe('delete', () => {
        const deleteRequest = {
            params: { id: 'sport-uuid-1' },
        } as FastifyRequest<any>;

        it('debe retornar 204 al eliminar exitosamente', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockResolvedValueOnce(undefined);

            await controller.delete(deleteRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        // Requiere PR fix/sport-http-404-recurso-no-encontrado (PR #51)
        it('debe retornar 404 si el deporte no existe', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockRejectedValueOnce(
                new Error('El deporte no existe'),
            );

            await controller.delete(deleteRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
        });

        it('debe retornar 409 si el deporte tiene inscripciones activas', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockRejectedValueOnce(
                new Error('No se puede eliminar un deporte con inscripciones activas'),
            );

            await controller.delete(deleteRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('debe retornar 500 para errores desconocidos', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockRejectedValueOnce(new Error('DB error'));

            await controller.delete(deleteRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
        });
    });
});
