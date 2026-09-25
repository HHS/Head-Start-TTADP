import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { auditLogger } from '../../logger';
import { checkCreateEventBody, checkUpdateEventBody } from './middleware';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

const buildRes = () => {
  const send = jest.fn();
  return { send, res: { status: jest.fn(() => ({ send })) } };
};

const validData = {
  eventName: 'A training event',
  eventId: 'R01-PD-1234',
  status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
  startDate: '01/02/2026',
  endDate: '01/03/2026',
  reasons: ['New Staff/Turnover'],
  targetPopulations: ['Program Staff'],
};

const validBody = (data = validData) => ({
  ownerId: 1,
  pocIds: [2],
  collaboratorIds: [3],
  regionId: 1,
  data: { ...data },
});

describe('events schema validation middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls next for a valid create body', () => {
    const req = { body: validBody() };
    const { res } = buildRes();
    const next = jest.fn();

    checkCreateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for a valid update body', () => {
    const req = { body: validBody() };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data.eventName).toBe('A training event');
    expect(req.body.ownerId).toBe(1);
  });

  it('strips an unknown key from data rather than rejecting it', () => {
    const req = { body: validBody({ ...validData, somethingNobodyDeclared: 'x' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.data).not.toHaveProperty('somethingNobodyDeclared');
    expect(req.body.data.eventName).toBe('A training event');
  });

  // TTAHUB-2745: the event form nested the whole sessionReports array into the blob.
  it('strips data.sessionReports', () => {
    const req = { body: validBody({ ...validData, sessionReports: [{ id: 1 }, { id: 2 }] }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data).not.toHaveProperty('sessionReports');
  });

  it('strips the round-tripped id, version, region and updatedAt from data', () => {
    const req = {
      body: validBody({
        ...validData,
        id: 9,
        version: 2,
        region: 1,
        updatedAt: '2026-01-01T00:00:00Z',
      }),
    };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(Object.keys(req.body.data).sort()).toEqual(Object.keys(validData).sort());
  });

  // completeEvent / suspendEvent / resumeEvent spread an entire API event into
  // the request body. This must not 400.
  it('accepts a completeEvent-shaped body carrying the whole API event', () => {
    const req = {
      body: {
        ...validBody({ ...validData, status: TRAINING_REPORT_STATUSES.COMPLETE }),
        id: 9,
        owner: { id: 1, name: 'Owner', email: 'o@example.com' },
        eventId: 'R01-PD-1234',
        updatedAt: '2026-01-01T00:00:00Z',
        version: 2,
        eventReportPilotNationalCenterUsers: [{ userId: 1 }],
        sessionReports: [{ id: 1 }],
      },
    };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).not.toHaveProperty('sessionReports');
    expect(req.body).not.toHaveProperty('eventReportPilotNationalCenterUsers');
    expect(req.body.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
  });

  // stripUnknown recurses into object subschemas, so these are Joi.any().
  it('leaves the free-form owner and pageState subtrees intact', () => {
    const owner = { id: 1, name: 'Owner', roles: [{ name: 'NC', nested: { deep: true } }] };
    const pageState = { 1: 'Complete', 2: 'In progress' };
    const req = { body: validBody({ ...validData, owner, pageState }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data.owner).toEqual(owner);
    expect(req.body.data.pageState).toEqual(pageState);
  });

  // convert is off — a coerced value would be persisted into JSONB.
  it('does not coerce string values to numbers', () => {
    const req = { body: validBody({ ...validData, additionalRegions: ['2', 3] }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data.additionalRegions).toEqual(['2', 3]);
  });

  /**
   * TTAHUB regression, caught by tests/e2e/training-report.spec.ts: the TR form's
   * multi-selects use `defaultValue=""`, so a field the user never touched
   * round-trips '' and every save 400'd. Asserted over every array field rather
   * than the one the e2e run happened to exercise.
   */
  it.each(['reasons', 'targetPopulations', 'additionalStates', 'additionalRegions'])(
    'accepts an empty string for an untouched %s',
    (field) => {
      const req = { body: validBody({ ...validData, [field]: '' }) };
      const { res } = buildRes();
      const next = jest.fn();

      checkUpdateEventBody(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.data[field]).toBe('');
    }
  );

  it.each(['reasons', 'targetPopulations', 'additionalStates', 'additionalRegions'])(
    'accepts null for a %s a legacy row never set',
    (field) => {
      const req = { body: validBody({ ...validData, [field]: null }) };
      const { res } = buildRes();
      const next = jest.fn();

      checkUpdateEventBody(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  );

  // The same allowance covers the top-level id arrays, which the TR form sends
  // as `pocIds || null` from frontend/src/pages/TrainingReportForm/index.js.
  it.each(['pocIds', 'collaboratorIds'])('accepts an empty string or null for %s', (field) => {
    const req = { body: { ...validBody(), [field]: null } };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('still rejects a non-empty string for an array field', () => {
    const req = { body: validBody({ ...validData, additionalStates: 'Rhode Island' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('still rejects a wrongly typed item inside an array field', () => {
    const req = { body: validBody({ ...validData, reasons: [1] }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an unrecognized status with a 400', () => {
    const req = { body: validBody({ ...validData, status: 'Bogus' }) };
    const { res, send } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('Received malformed request body'));
    expect(auditLogger.error).toHaveBeenCalled();
  });

  it('rejects a malformed start date with a 400', () => {
    const req = { body: validBody({ ...validData, startDate: '2026-13-45' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an impossible date with a 400', () => {
    const req = { body: validBody({ ...validData, startDate: '13/45/2026' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a missing data blob with a 400 rather than letting it 500', () => {
    const req = { body: { ownerId: 1, regionId: 1, collaboratorIds: [] } };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('requires data.eventId on create', () => {
    const { eventId, ...withoutEventId } = validData;
    const req = { body: validBody(withoutEventId) };
    const { res } = buildRes();
    const next = jest.fn();

    checkCreateEventBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
