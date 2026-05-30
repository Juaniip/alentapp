import { describe, it, expect, beforeEach } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { SportRepository } from '../SportRepository.js';

describe('SportValidator', () => {
    const mockSportRepo = {} as SportRepository;
    const validator = new SportValidator(mockSportRepo);

    describe('validateMaxCapacity', () => {
        it('debe pasar si el cupo es un entero mayor a cero', () => {
            expect(() => validator.validateMaxCapacity(1)).not.toThrow();
            expect(() => validator.validateMaxCapacity(20)).not.toThrow();
            expect(() => validator.validateMaxCapacity(100)).not.toThrow();
        });

        it('debe lanzar error si el cupo es cero', () => {
            expect(() => validator.validateMaxCapacity(0))
                .toThrow('El cupo máximo debe ser mayor a cero');
        });

        it('debe lanzar error si el cupo es negativo', () => {
            expect(() => validator.validateMaxCapacity(-1))
                .toThrow('El cupo máximo debe ser mayor a cero');
            expect(() => validator.validateMaxCapacity(-100))
                .toThrow('El cupo máximo debe ser mayor a cero');
        });

        it('debe lanzar error si el cupo es un número decimal', () => {
            expect(() => validator.validateMaxCapacity(1.5))
                .toThrow('El cupo máximo debe ser mayor a cero');
            expect(() => validator.validateMaxCapacity(10.1))
                .toThrow('El cupo máximo debe ser mayor a cero');
        });

        it('debe lanzar error si el cupo es NaN', () => {
            expect(() => validator.validateMaxCapacity(NaN))
                .toThrow('El cupo máximo debe ser mayor a cero');
        });
    });

    describe('validateNameNotModified', () => {
        it('debe pasar si el campo name no está presente en el objeto', () => {
            expect(() => validator.validateNameNotModified({ description: 'Descripción' }))
                .not.toThrow();
            expect(() => validator.validateNameNotModified({}))
                .not.toThrow();
        });

        it('debe pasar si name está presente pero es undefined', () => {
            expect(() => validator.validateNameNotModified({ name: undefined }))
                .not.toThrow();
        });

        it('debe lanzar error si name tiene un valor definido', () => {
            expect(() => validator.validateNameNotModified({ name: 'Fútbol' }))
                .toThrow('El nombre del deporte no puede modificarse');
            expect(() => validator.validateNameNotModified({ name: '' }))
                .toThrow('El nombre del deporte no puede modificarse');
        });
    });
});
