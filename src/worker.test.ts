const mockThrong = jest.fn();
const mockRunContext = jest.fn((callback) => callback());
const mockSetContext = jest.fn();
const mockRegisterEventListener = jest.fn();
const mockProcessNotificationQueue = jest.fn();
const mockExecuteCronEnrollmentFunctions = jest.fn();
const mockProcessMaintenanceQueue = jest.fn();
const mockRunMaintenanceCronJobs = jest.fn();
const mockProcessResourceQueue = jest.fn();
const mockProcessS3Queue = jest.fn();
const mockProcessScanQueue = jest.fn();

jest.mock('throng', () => mockThrong);
jest.mock('express-http-context', () => ({
    ns: { run: mockRunContext },
    set: mockSetContext,
}));
jest.mock('./envParser', () => ({ isTrue: jest.fn(() => false) }));
jest.mock('./lib/mailer', () => ({
    processNotificationQueue: mockProcessNotificationQueue,
}));
jest.mock('./lib/maintenance', () => ({
    executeCronEnrollmentFunctions: mockExecuteCronEnrollmentFunctions,
    processMaintenanceQueue: mockProcessMaintenanceQueue,
    runMaintenanceCronJobs: mockRunMaintenanceCronJobs,
}));
jest.mock('./logger', () => ({ logger: { info: jest.fn() } }));
jest.mock('./processHandler', () => ({
    registerEventListener: mockRegisterEventListener,
}));
jest.mock('./services/resourceQueue', () => ({
    processResourceQueue: mockProcessResourceQueue,
}));
jest.mock('./services/s3Queue', () => ({ processS3Queue: mockProcessS3Queue }));
jest.mock('./services/scanQueue', () => ({ processScanQueue: mockProcessScanQueue }));

describe('worker startup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CF_INSTANCE_INDEX = '0';
        delete process.env.WORKER_CONCURRENCY;
    });

    afterAll(() => {
        delete process.env.CF_INSTANCE_INDEX;
        delete process.env.WORKER_CONCURRENCY;
    });

    it('defaults to two workers and starts every queue', async () => {
        jest.isolateModules(() => require('./worker'));

        expect(mockThrong).toHaveBeenCalledWith(
            expect.objectContaining({ workers: 2, start: expect.any(Function) })
        );

        const { start } = mockThrong.mock.calls[0][0];
        await start(1);

        expect(mockRegisterEventListener).toHaveBeenCalledTimes(1);
        expect(mockProcessScanQueue).toHaveBeenCalledTimes(1);
        expect(mockProcessS3Queue).toHaveBeenCalledTimes(1);
        expect(mockProcessResourceQueue).toHaveBeenCalledTimes(1);
        expect(mockProcessNotificationQueue).toHaveBeenCalledTimes(1);
        expect(mockProcessMaintenanceQueue).toHaveBeenCalledTimes(1);
    });

    it('uses configured concurrency and only starts cron in the first worker', async () => {
        process.env.WORKER_CONCURRENCY = '1';
        jest.isolateModules(() => require('./worker'));

        const { start, workers } = mockThrong.mock.calls[0][0];
        expect(workers).toBe('1');

        await start(1);
        await start(2);

        expect(mockExecuteCronEnrollmentFunctions).toHaveBeenCalledTimes(1);
        expect(mockExecuteCronEnrollmentFunctions).toHaveBeenCalledWith('0', 1, 'test');
        expect(mockRunMaintenanceCronJobs).toHaveBeenCalledTimes(1);
        expect(mockProcessMaintenanceQueue).toHaveBeenCalledTimes(2);
    });
});
