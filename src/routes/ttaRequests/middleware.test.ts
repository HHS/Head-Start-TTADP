import type { NextFunction, Request, Response } from 'express';
import { auditLogger } from '../../logger';
import {
  checkCreateTtaRequestBody,
  checkSubmitTtaRequestBody,
  checkUpdateTtaRequestBody,
} from './middleware';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

const run = (middleware, body) => {
  const req = { body } as Request;
  const send = jest.fn();
  const status = jest.fn(() => ({ send }));
  const res = { status } as unknown as Response;
  const next = jest.fn() as NextFunction;
  middleware(req, res, next);
  return { req, status, send, next };
};

const fullBody = {
  regionId: 1,
  recipientId: 2,
  grantIds: [3, 4],
  recipientAware: false,
  originator: 'TTA Staff',
  goalTemplateId: 5,
  citations: [{ citation: '1302.12', findingType: 'Deficiency' }],
  context: '<p>context</p>',
  creatorNotes: '',
  reviewerId: 6,
};

describe('TTA request body middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkCreateTtaRequestBody', () => {
    it('accepts a full body', () => {
      const { req, next, status } = run(checkCreateTtaRequestBody, fullBody);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
      expect(req.body).toEqual(fullBody);
    });

    it('accepts a draft with only a region', () => {
      const { next } = run(checkCreateTtaRequestBody, { regionId: 1 });
      expect(next).toHaveBeenCalled();
    });

    it('accepts cleared fields', () => {
      const { next } = run(checkCreateTtaRequestBody, {
        regionId: 1,
        recipientId: null,
        grantIds: [],
        recipientAware: null,
        originator: null,
        goalTemplateId: null,
        citations: [],
        context: null,
        reviewerId: null,
      });
      expect(next).toHaveBeenCalled();
    });

    it('strips keys the client does not set', () => {
      const { req, next } = run(checkCreateTtaRequestBody, {
        regionId: 1,
        id: 99,
        userId: 99,
        status: 'approved',
      });
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ regionId: 1 });
    });

    it.each([
      ['a missing region', { recipientId: 1 }],
      ['a string id', { regionId: '1' }],
      ['an unknown originator', { regionId: 1, originator: 'Someone else' }],
      ['a non-integer grant', { regionId: 1, grantIds: [1.5] }],
      ['duplicate grants', { regionId: 1, grantIds: [1, 1] }],
      ['a string for recipientAware', { regionId: 1, recipientAware: 'yes' }],
      ['a citation without a name', { regionId: 1, citations: [{ findingType: 'Deficiency' }] }],
      ['duplicate citations', { regionId: 1, citations: [{ citation: 'a' }, { citation: 'a' }] }],
    ])('rejects %s', (_label, body) => {
      const { next, status, send } = run(checkCreateTtaRequestBody, body);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(send).toHaveBeenCalledWith(expect.stringContaining('Received malformed request body'));
      expect(auditLogger.error).toHaveBeenCalled();
    });
  });

  describe('checkUpdateTtaRequestBody', () => {
    it('does not require a region and strips one that is sent', () => {
      const { req, next } = run(checkUpdateTtaRequestBody, { regionId: 2, context: 'x' });
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ context: 'x' });
    });

    it('rejects a malformed field', () => {
      const { next, status } = run(checkUpdateTtaRequestBody, { reviewerId: 'me' });
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkSubmitTtaRequestBody', () => {
    it('accepts a complete body and strips the region', () => {
      const { req, next } = run(checkSubmitTtaRequestBody, fullBody);
      expect(next).toHaveBeenCalled();
      const { regionId: _regionId, ...expected } = fullBody;
      expect(req.body).toEqual(expected);
    });

    it.each([
      'recipientId',
      'grantIds',
      'recipientAware',
      'originator',
      'goalTemplateId',
      'context',
      'reviewerId',
    ])('rejects a body without %s', (field) => {
      const { next, status } = run(checkSubmitTtaRequestBody, { ...fullBody, [field]: null });
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
    });

    it('accepts context as the rich text editor sends it, with a trailing newline', () => {
      const { next } = run(checkSubmitTtaRequestBody, { ...fullBody, context: '<p>context</p>\n' });
      expect(next).toHaveBeenCalled();
    });

    it('rejects an empty grant list and blank context', () => {
      expect(
        run(checkSubmitTtaRequestBody, { ...fullBody, grantIds: [] }).next
      ).not.toHaveBeenCalled();
      expect(
        run(checkSubmitTtaRequestBody, { ...fullBody, context: '  ' }).next
      ).not.toHaveBeenCalled();
    });
  });
});
