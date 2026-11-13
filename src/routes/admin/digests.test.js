import { isNonProductionEnvironment } from '../../envParser';
import { handleError } from '../../lib/apiErrorHandler';
import { sendEmailDigests } from '../../lib/cron';
import { runDigests } from './digests';

jest.mock('../../lib/cron', () => ({
  sendEmailDigests: jest.fn(),
}));

jest.mock('../../envParser', () => ({
  ...jest.requireActual('../../envParser'),
  isNonProductionEnvironment: jest.fn(),
}));

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../logger', () => ({
  auditLogger: { info: jest.fn(), error: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe('admin digests', () => {
  const json = jest.fn();
  const mockResponse = {
    json,
    status: jest.fn(() => mockResponse),
  };
  const mockRequest = (frequency) => ({
    session: { userId: 1 },
    params: { frequency },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    isNonProductionEnvironment.mockReturnValue(true);
  });

  it('refuses to run in production', async () => {
    isNonProductionEnvironment.mockReturnValue(false);

    await runDigests(mockRequest('daily'), mockResponse);

    expect(sendEmailDigests).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('runs the daily digests with training report notifications', async () => {
    sendEmailDigests.mockResolvedValue(3);

    await runDigests(mockRequest('daily'), mockResponse);

    expect(sendEmailDigests).toHaveBeenCalledWith('DAILY', { includeTrainingReport: true });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ frequency: 'DAILY', queued: 3 });
  });

  it('runs the weekly and monthly digests without training report notifications', async () => {
    sendEmailDigests.mockResolvedValue(0);

    await runDigests(mockRequest('weekly'), mockResponse);
    await runDigests(mockRequest('monthly'), mockResponse);

    expect(sendEmailDigests).toHaveBeenCalledWith('WEEKLY', { includeTrainingReport: false });
    expect(sendEmailDigests).toHaveBeenCalledWith('MONTHLY', { includeTrainingReport: false });
  });

  it('rejects an unknown frequency', async () => {
    await runDigests(mockRequest('hourly'), mockResponse);

    expect(sendEmailDigests).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('handles errors', async () => {
    const error = new Error('boom');
    sendEmailDigests.mockRejectedValue(error);
    const req = mockRequest('daily');

    await runDigests(req, mockResponse);

    expect(handleError).toHaveBeenCalledWith(req, mockResponse, error, {
      namespace: 'ADMIN:DIGESTS:RUN',
    });
  });
});
