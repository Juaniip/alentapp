import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

// Members
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { MemberController } from './delivery/MemberController.js';
// Locker
import { PrismaLockerRepository } from './infrastructure/PrismaLockerRepository.js';
import { CreateLockerUseCase } from './application/CreateLockerUseCase.js';
import { LockerController } from './delivery/LockerController.js';
import { GetLockersUseCase } from './application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from './application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from './application/DeleteLockerUseCase.js';
// Payments
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { CreatePaymentUseCase } from './application/NewPaymentUseCase.js'; 
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.js';
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.js';
import { CancelPaymentUseCase } from './application/DeletePaymentUseCase.js'; 
import { PaymentController } from './delivery/PaymentController.js';
// Sports
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { CreateSportUseCase } from './application/CreateSportUseCase.js';
import { UpdateSportUseCase } from './application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from './application/DeleteSportUseCase.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { DeleteSportValidator } from './domain/services/DeleteSportValidator.js';
import { SportController } from './delivery/SportController.js';

// EquipmentLoan
import { PrismaEquipmentLoanRepository } from './infrastructure/PrismaEquipmentLoanRepository.js';
import { CreateEquipmentLoanUseCase } from './application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from './application/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from './application/DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanController } from './delivery/EquipmentLoanController.js';
import { GetEquipmentLoansUseCase } from './application/GetEquipmentLoansUseCase.js';


export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
            : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    //Dependencias de Member
    // --- Members ---
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);
    
    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);
    
    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase,
    );

    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));

    //Dependencias de Payment
    const paymentRepo = new PostgresPaymentRepository();

    // Le pasamos el memberRepo que ya instanciamos arriba para no crear dos!
    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, memberRepo);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo);
    const cancelPaymentUseCase = new CancelPaymentUseCase(paymentRepo);

    const paymentController = new PaymentController(
        createPaymentUseCase,
        getPaymentsUseCase,
        updatePaymentUseCase,
        cancelPaymentUseCase
    );

    server.get('/api/v1/payments', paymentController.getAll.bind(paymentController));
    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.put('/api/v1/payments/:id', paymentController.update.bind(paymentController));
    server.delete('/api/v1/payments/:id', paymentController.delete.bind(paymentController));

    // Ruta de prueba
    // --- Lockers ---
    const lockerRepo = new PrismaLockerRepository();
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);
    const updateLockerUseCase = new UpdateLockerUseCase(lockerRepo);
    const deleteLockerUseCase = new DeleteLockerUseCase(lockerRepo);
    const lockerController = new LockerController(
        createLockerUseCase,
        getLockersUseCase,
        updateLockerUseCase,
        deleteLockerUseCase,
    );

    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.put('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));

    // --- Sports ---
    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);
    const deleteSportValidator = new DeleteSportValidator(sportRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo, deleteSportValidator);
    const sportController = new SportController(createSportUseCase, updateSportUseCase, deleteSportUseCase);

    server.post('/api/v1/deportes', sportController.create.bind(sportController));
    server.put('/api/v1/deportes/:id', sportController.update.bind(sportController));
    server.delete('/api/v1/deportes/:id', sportController.delete.bind(sportController));
    
    
    // --- EquipmentLoan ---
    const equipmentLoanRepo = new PrismaEquipmentLoanRepository();
    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo);
    const updateEquipmentLoanUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo);
    const deleteEquipmentLoanUseCase = new DeleteEquipmentLoanUseCase(equipmentLoanRepo);
    const getEquipmentLoansUseCase = new GetEquipmentLoansUseCase(equipmentLoanRepo);
    const equipmentLoanController = new EquipmentLoanController(
        createEquipmentLoanUseCase,
        updateEquipmentLoanUseCase,
        deleteEquipmentLoanUseCase,
        getEquipmentLoansUseCase, 
    );

    server.get('/api/v1/equipment-loans', equipmentLoanController.getAll.bind(equipmentLoanController));
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));
    server.put('/api/v1/equipment-loans/:id', equipmentLoanController.update.bind(equipmentLoanController));
    server.delete('/api/v1/equipment-loans/:id', equipmentLoanController.delete.bind(equipmentLoanController));
    
    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' });
    });

    return server;
}

if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}