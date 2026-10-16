import express from 'express';
import { EventEmitter, once } from 'node:events';
import { Transaction } from 'sequelize';
import request from 'supertest';
import handleErrors from '../lib/apiErrorHandler';
import { hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import db from '../models';
import { removeFromAuditedTransactions } from '../models/auditModelGenerator';
import transactionWrapper, { readOnlyTransactionWrapper } from './transactionWrapper';

jest.mock('../lib/apiErrorHandler', () =>
  jest.fn((req, _res, err, context) => {
    if (req?.inTransactionWrapper) {
      throw err;
    }
    return context;
  })
);
jest.mock('../lib/programmaticTransaction', () => ({
  captureSnapshot: jest.fn(),
  hasModifiedData: jest.fn(),
}));
jest.mock('../models/auditModelGenerator', () => {
  const actual = jest.requireActual('../models/auditModelGenerator');

  return {
    ...actual,
    addAuditTransactionSettings: jest.fn(),
    removeFromAuditedTransactions: jest.fn(),
  };
});

describe('transactionWrapper', () => {
  let originalFunction = jest.fn().mockResolvedValue('result');
  let wrapper;

  beforeEach(() => {
    jest
      .spyOn(db.sequelize, 'transaction')
      .mockImplementation(async (_options, callback) => callback({ id: 'transaction-id' }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  afterAll(() => db.sequelize.close());
  it('should call the original function', async () => {
    originalFunction = jest.fn();
    wrapper = transactionWrapper(originalFunction);
    await wrapper();
    expect(originalFunction).toHaveBeenCalled();
  });

  it('marks the request as running inside transactionWrapper during handler execution', async () => {
    let inTransactionWrapper;
    originalFunction = jest.fn().mockImplementation((req) => {
      inTransactionWrapper = req.inTransactionWrapper;
      return 'result';
    });
    wrapper = transactionWrapper(originalFunction);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapper(req, res, next);

    expect(inTransactionWrapper).toBe(true);
    expect(req.inTransactionWrapper).toBeUndefined();
    expect(originalFunction).toHaveBeenCalledWith(req, res, expect.any(Function));
  });

  it('should log the execution time of the original function', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction);
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('execution time'));
  });

  it('should accept and log the context, if specified', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction, 'testContext');
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('testContext'));
  });

  it('should handle errors in the original function', async () => {
    const error = new Error('Test Error');
    originalFunction = jest.fn().mockRejectedValue(error);
    wrapper = transactionWrapper(originalFunction);

    // Correctly mock `handleErrors` as a function
    const req = {};
    const res = {
      status: () => jest.fn().mockReturnValue({ end: () => jest.fn() }),
    };
    const next = jest.fn();

    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
      namespace: 'SERVICE:WRAPPER',
    });
    expect(removeFromAuditedTransactions).toHaveBeenCalled();
    expect(req.inTransactionWrapper).toBeUndefined();
  });

  it('rejects the transaction callback when a wrapped handler catches and delegates to handleErrors', async () => {
    const error = new Error('Test Error');
    let transactionCallbackRejected = false;
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      try {
        return await callback({ id: 'transaction-id' });
      } catch (err) {
        transactionCallbackRejected = true;
        throw err;
      }
    });
    originalFunction = jest.fn(async (req, res) => {
      try {
        req.writeHappened = true;
        throw error;
      } catch (err) {
        return handleErrors(req, res, err, { namespace: 'INNER_HANDLER' });
      }
    });
    wrapper = transactionWrapper(originalFunction);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapper(req, res, next);

    expect(transactionCallbackRejected).toBe(true);
    expect(handleErrors).toHaveBeenNthCalledWith(1, req, res, error, {
      namespace: 'INNER_HANDLER',
    });
    expect(handleErrors).toHaveBeenNthCalledWith(2, req, res, error, {
      namespace: 'SERVICE:WRAPPER',
    });
    expect(removeFromAuditedTransactions).toHaveBeenCalled();
    expect(req.inTransactionWrapper).toBeUndefined();
  });

  it('rolls back before returning a structured HTTP error', async () => {
    const error = Object.assign(new Error('Blocked'), {
      statusCode: 409,
      responseBody: {
        code: 'GOAL_STATUS_CHANGE_BLOCKED',
        reasons: ['ACTIVE_ACTIVITY_REPORT'],
      },
    });
    let transactionCallbackRejected = false;
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      try {
        return await callback({ id: 'transaction-id' });
      } catch (err) {
        transactionCallbackRejected = true;
        throw err;
      }
    });
    originalFunction = jest.fn().mockRejectedValue(error);
    wrapper = transactionWrapper(originalFunction);
    const json = jest.fn();
    const req = {};
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await wrapper(req, res, jest.fn());

    expect(transactionCallbackRejected).toBe(true);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(error.responseBody);
    expect(handleErrors).not.toHaveBeenCalled();
    expect(req.inTransactionWrapper).toBeUndefined();
  });

  it('should call hasModifiedData and throw error if data is modified in readOnlyTransactionWrapper', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = readOnlyTransactionWrapper(originalFunction);

    const mockHasModifiedData = hasModifiedData.mockResolvedValue(true);
    const req = {};
    const res = {};
    const next = jest.fn();

    // Expect an error because hasModifiedData is mocked to return true (indicating modified data)
    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(
      req,
      res,
      expect.objectContaining({
        message: 'Transaction was flagged as READONLY, but has modifed data.',
      }),
      { namespace: 'SERVICE:WRAPPER' }
    );

    mockHasModifiedData.mockRestore();
  });

  it('should pass transaction options through to sequelize.transaction', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction, '', false, {
      isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    });

    await wrapper();

    expect(db.sequelize.transaction).toHaveBeenCalledWith(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      expect.any(Function)
    );
  });

  it.each([200, 204])('defers a %s response until commit', async (status) => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      await callback({ id: 'transaction-id' });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    await transactionWrapper(async (_req, response) => {
      if (status === 204) response.status(status).end();
      else response.status(status).json({ saved: true });
    })({}, res);

    expect(res.status).toHaveBeenCalledWith(status);
    if (status === 204) expect(res.end).toHaveBeenCalledTimes(1);
    else expect(res.json).toHaveBeenCalledWith({ saved: true });
  });

  it.each(['commit', 'rollback'])(
    'returns an error without sending success when %s fails',
    async (phase) => {
      const error = new Error(`${phase} failed`);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), end: jest.fn() };
      db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
        if (phase === 'rollback')
          await expect(callback({ id: 'transaction-id' })).rejects.toThrow('Handler failed');
        else await callback({ id: 'transaction-id' });
        throw error;
      });
      handleErrors.mockImplementationOnce((_req, response) => response.status(500).end());

      await transactionWrapper(async (_req, response) => {
        response.status(200).json({ saved: true });
        if (phase === 'rollback') throw new Error('Handler failed');
      })({}, res);

      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalledTimes(1);
    }
  );

  it('discards pending success when read-only validation fails', async () => {
    hasModifiedData.mockResolvedValueOnce(true);
    const res = { sendStatus: jest.fn() };

    await readOnlyTransactionWrapper(async (_req, response) => response.sendStatus(204))({}, res);

    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
  });

  it('defers CSV headers and writes until commit', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      await callback({ id: 'transaction-id' });
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    await transactionWrapper(async (_req, response) => {
      response.setHeader('Content-Type', 'text/csv');
      expect(response.write('id\n1\n')).toBe(true);
      response.end();
    })({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.write).toHaveBeenCalledWith('id\n1\n');
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it('streams directly to the response when response deferral is disabled', async () => {
    const res = Object.assign(new EventEmitter(), {
      write: jest.fn().mockReturnValueOnce(false).mockReturnValue(true),
      end: jest.fn(),
    });
    let transactionFinished = false;
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      const result = await callback({ id: 'transaction-id' });
      transactionFinished = true;
      return result;
    });

    const responsePromise = transactionWrapper(
      async (_req, response) => {
        if (!response.write('first')) await once(response, 'drain');
        response.write('second');
        response.end();
      },
      '',
      false,
      {},
      { deferResponseUntilCommit: false }
    )({}, res);

    await new Promise(setImmediate);

    expect(res.write).toHaveBeenCalledTimes(1);
    expect(transactionFinished).toBe(false);
    res.emit('drain');
    await responsePromise;

    expect(res.write).toHaveBeenCalledTimes(2);
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(transactionFinished).toBe(true);
  });

  it.each(['sendFile', 'sendfile', 'download', 'render'])(
    'defers %s until commit',
    async (method) => {
      const res = { [method]: jest.fn() };
      db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
        await callback({ id: 'transaction-id' });
        expect(res[method]).not.toHaveBeenCalled();
      });

      await transactionWrapper(async (_req, response) => response[method]('report'))({}, res);

      expect(res[method]).toHaveBeenCalledWith('report');
    }
  );

  it('defers downstream middleware until commit', async () => {
    const next = jest.fn();
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      await callback({ id: 'transaction-id' });
      expect(next).not.toHaveBeenCalled();
    });

    await transactionWrapper(async (_req, _res, proceed) => proceed())({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sends a real JSON response after commit', async () => {
    const app = express();
    let committed = false;
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      const result = await callback({ id: 'transaction-id' });
      committed = true;
      return result;
    });
    app.get(
      '/',
      transactionWrapper(async (_req, response) => {
        expect(committed).toBe(false);
        response.status(200).json({ saved: true });
        expect(response.headersSent).toBe(true);
      })
    );

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ saved: true });
    expect(committed).toBe(true);
  });

  it.each([200, 204])(
    'returns HTTP 500 instead of pending %s when commit fails',
    async (status) => {
      const app = express();
      db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
        await callback({ id: 'transaction-id' });
        throw new Error('Commit failed');
      });
      handleErrors.mockImplementationOnce((_req, response) => response.status(500).end());
      app.get(
        '/',
        transactionWrapper(async (_req, response) => response.sendStatus(status))
      );

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
    }
  );

  it('discards buffered CSV headers and data when commit fails', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      await callback({ id: 'transaction-id' });
      throw new Error('Commit failed');
    });

    await transactionWrapper(async (_req, response) => {
      response.setHeader('Content-Type', 'text/csv');
      response.write('id\n1\n');
      response.end();
    })({}, res);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
  });

  it('aborts instead of committing when the pending response is destroyed', async () => {
    const error = new Error('Stream failed');
    const res = { write: jest.fn(), destroy: jest.fn() };
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      await expect(callback({ id: 'transaction-id' })).rejects.toThrow(error);
      throw error;
    });

    await transactionWrapper(async (_req, response) => {
      response.write('pending');
      response.destroy(error);
    })({}, res);

    expect(res.write).not.toHaveBeenCalled();
    expect(res.destroy).not.toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalledWith(expect.anything(), res, error, expect.anything());
  });

  it('forwards errors after real headers are sent', async () => {
    const error = new Error('Write failed');
    const res = {
      headersSent: false,
      end: jest.fn(() => {
        res.headersSent = true;
        throw error;
      }),
    };
    const next = jest.fn();

    await transactionWrapper(async (_req, response) => response.end())({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(handleErrors).not.toHaveBeenCalled();
  });
});
