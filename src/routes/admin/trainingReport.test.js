import httpCodes from 'http-codes';
import { readFileSync } from 'fs';
import multiparty from 'multiparty';
import { importTrainingReport } from './trainingReport';
import { handleError } from '../../lib/apiErrorHandler';
import { csvImport } from '../../services/event';

jest.mock('http-codes', () => ({
  BAD_REQUEST: 400,
  OK: 200,
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('multiparty', () => ({
  Form: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockImplementation((_, callback) => {
      const fields = {};
      const files = {
        file: [
          {
            headers: {
              'content-type': 'text/csv',
            },
            path: '/path/to/file.csv',
          },
        ],
      };
      callback(null, fields, files);
    }),
  })),
}));

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../services/event', () => ({
  csvImport: jest.fn().mockResolvedValue({ success: true }),
}));

describe('importTrainingReport', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle error when form parsing fails', async () => {
    const error = new Error('Form parsing failed');
    const logContext = { namespace: 'ADMIN:TRAINING_REPORT' };

    multiparty.Form.mockImplementationOnce(() => ({
      parse: jest.fn().mockImplementation((_, callback) => {
        callback(error);
      }),
    }));

    await importTrainingReport(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenCalledWith(req, res, error, logContext);
  });

  it('should return bad request if file type is not text/csv', async () => {
    const logContext = { namespace: 'ADMIN:TRAINING_REPORT' };

    multiparty.Form.mockImplementationOnce(() => ({
      parse: jest.fn().mockImplementation((_, callback) => {
        const fields = {};
        const files = {
          file: [
            {
              headers: {
                'content-type': 'application/pdf',
              },
              path: '/path/to/file.pdf',
            },
          ],
        };
        callback(null, fields, files);
      }),
    }));

    await importTrainingReport(req, res);

    expect(res.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file type' });
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should read file and call csvImport with file content', async () => {
    const logContext = { namespace: 'ADMIN:TRAINING_REPORT' };
    const buf = Buffer.from('file content');
    readFileSync.mockReturnValueOnce(buf);

    await importTrainingReport(req, res);

    expect(readFileSync).toHaveBeenCalledWith('/path/to/file.csv');
    expect(csvImport).toHaveBeenCalledWith(buf);
    expect(res.status).toHaveBeenCalledWith(httpCodes.OK);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(handleError).not.toHaveBeenCalled();
  });

  it('should handle error when csvImport fails', async () => {
    const error = new Error('CSV import failed');
    const logContext = { namespace: 'ADMIN:TRAINING_REPORT' };
    readFileSync.mockReturnValueOnce(Buffer.from('file content'));
    csvImport.mockRejectedValueOnce(error);

    await importTrainingReport(req, res);

    expect(readFileSync).toHaveBeenCalledWith('/path/to/file.csv');
    expect(csvImport).toHaveBeenCalledWith(Buffer.from('file content'));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenCalledWith(req, res, error, logContext);
  });
});
