import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import fs from 'fs';
import path from 'path';
import { auditLogger } from '../../logger';
import { checkCreateSessionBody, checkUpdateSessionBody, sessionDataSchema } from './middleware';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

const buildRes = () => {
  const send = jest.fn();
  return { send, res: { status: jest.fn(() => ({ send })) } };
};

// Mirrors the IST half of istKeys in frontend/src/pages/SessionForm/constants.js
const istData = {
  sessionName: 'Session one',
  startDate: '01/02/2026',
  endDate: '01/03/2026',
  duration: '1.5',
  context: 'some context',
  objective: 'an objective',
  objectiveTopics: ['Coaching'],
  objectiveSupportType: 'Planning',
  objectiveResources: [{ value: 'https://example.com' }],
  useIpdCourses: false,
  courses: [],
  files: [],
  ttaProvided: '<p>tta</p>',
  status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
};

// Mirrors the POC half of pocKeys
const pocData = {
  isIstVisit: 'no',
  recipients: [{ value: 1, label: 'Recipient' }],
  participants: [{ value: 'a', label: 'A' }],
  ttaType: ['training'],
  numberOfParticipants: '10',
  deliveryMethod: 'hybrid',
  numberOfParticipantsInPerson: '4',
  numberOfParticipantsVirtually: '6',
  language: ['English'],
  supportingAttachments: [],
  recipientNextSteps: [{ note: 'a note', completeDate: '01/04/2026' }],
  specialistNextSteps: [{ note: 'b note', completeDate: '01/05/2026' }],
  status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
};

const body = (data) => ({ eventId: 1, trainingReportId: 1, data: { ...data } });

describe('sessionReports schema validation middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an IST-role payload without stripping anything', () => {
    const req = { body: body(istData) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.data).toEqual(istData);
  });

  it('accepts a POC-role payload without stripping anything', () => {
    const req = { body: body(pocData) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data).toEqual(pocData);
  });

  it('accepts the combined admin payload', () => {
    const req = { body: body({ ...istData, ...pocData }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // onFormSubmit adds these after reduceDataToMatchKeys runs, so they are not in
  // istKeys/pocKeys but must still survive.
  it('accepts the completion markers added at submit time', () => {
    const completion = {
      pocComplete: true,
      pocCompleteId: 1,
      pocCompleteDate: '01/06/2026',
      collabComplete: true,
      collabCompleteId: 2,
      collabCompleteDate: '01/06/2026',
      ownerComplete: true,
      ownerCompleteId: 3,
      ownerCompleteDate: '01/06/2026',
      submitterId: 4,
      dateSubmitted: '01/06/2026',
      submitted: true,
      'pageVisited-supporting-attachments': true,
    };
    const req = { body: body({ ...istData, ...completion }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    Object.keys(completion).forEach((key) => {
      expect(req.body.data).toHaveProperty(key);
    });
  });

  // updateSession destructures these out of data and writes them to columns and
  // join tables. Stripping them would silently break those writes.
  it('keeps approverId, submitterId, trainers and goalTemplates', () => {
    const req = {
      body: body({
        ...istData,
        approverId: 7,
        submitterId: 8,
        trainers: [{ id: 1 }],
        goalTemplates: [{ id: 2 }],
      }),
    };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data.approverId).toBe(7);
    expect(req.body.data.submitterId).toBe(8);
    expect(req.body.data.trainers).toEqual([{ id: 1 }]);
    expect(req.body.data.goalTemplates).toEqual([{ id: 2 }]);
  });

  // Mirrors SESSION_ASSOCIATION_KEYS in src/services/sessionReports.ts
  it('strips the hydrated event and approver associations', () => {
    const req = { body: body({ ...istData, event: { id: 1, data: {} }, approver: { id: 2 } }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.data).not.toHaveProperty('event');
    expect(req.body.data).not.toHaveProperty('approver');
  });

  it('strips an unknown key rather than rejecting it', () => {
    const req = { body: body({ ...istData, notAThing: 'x' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.data).not.toHaveProperty('notAThing');
  });

  // Both forms autosave partial state, and the session form sends a role-filtered
  // subset, so no data key may be required.
  it('accepts a partial autosave with only a couple of keys', () => {
    const req = { body: body({ sessionName: 'just a name', context: '' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not coerce numeric strings', () => {
    const req = { body: body({ ...istData, duration: '1.5', numberOfParticipants: '10' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(req.body.data.duration).toBe('1.5');
    expect(req.body.data.numberOfParticipants).toBe('10');
  });

  // Sessions inherit additionalStates from the event, so they carry the same
  // empty string the TR form sends for an untouched multi-select. Asserted over
  // one field of each array helper (stringArray, optionList, nextSteps,
  // regionArray) rather than only the ones an e2e run happened to exercise.
  it.each([
    'objectiveTopics',
    'objectiveTrainers',
    'ttaType',
    'language',
    'additionalStates',
    'additionalRegions',
    'objectiveResources',
    'courses',
    'files',
    'recipients',
    'participants',
    'supportingAttachments',
    'trainers',
    'goalTemplates',
    'recipientNextSteps',
    'specialistNextSteps',
  ])('accepts an empty string or null for %s', (field) => {
    const empty = { body: body({ ...istData, [field]: '' }) };
    const nulled = { body: body({ ...istData, [field]: null }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(empty, res, next);
    checkUpdateSessionBody(nulled, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
    expect(empty.body.data[field]).toBe('');
    expect(nulled.body.data[field]).toBeNull();
  });

  it('still rejects a non-empty string for an array field', () => {
    const req = { body: body({ ...istData, objectiveTopics: 'Coaching' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // The approver's "request changes" path writes REPORT_STATUSES.NEEDS_ACTION
  // into data.status, and sessions in the database carry it.
  it('accepts the needs_action status a returned session carries', () => {
    const req = { body: body({ ...istData, status: REPORT_STATUSES.NEEDS_ACTION }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.data.status).toBe(REPORT_STATUSES.NEEDS_ACTION);
  });

  /**
   * TTAHUB-2763: ControlledDatePicker submits the entered text unchanged, and
   * frontend validation (frontend/src/utils.js isValidDate) accepts these
   * shorter forms, so a user who types them passes the form and got a 400 here.
   */
  it.each(['1/2/2026', '01/2/2026', '1/02/2026', '01/02/26'])(
    'accepts the typed date format %s',
    (startDate) => {
      const req = { body: body({ ...istData, startDate }) };
      const { res } = buildRes();
      const next = jest.fn();

      checkUpdateSessionBody(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.data.startDate).toBe(startDate);
    }
  );

  it('still rejects an impossible date in a shorter accepted format', () => {
    const req = { body: body({ ...istData, startDate: '13/45/26' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an unrecognized delivery method with a 400', () => {
    const req = { body: body({ ...pocData, deliveryMethod: 'telepathy' }) };
    const { res, send } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('Received malformed request body'));
    expect(auditLogger.error).toHaveBeenCalled();
  });

  it('rejects an unrecognized support type with a 400', () => {
    const req = { body: body({ ...istData, objectiveSupportType: 'Nope' }) };
    const { res } = buildRes();
    const next = jest.fn();

    checkUpdateSessionBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a missing eventId with a 400', () => {
    const req = { body: { data: { ...istData } } };
    const { res } = buildRes();
    const next = jest.fn();

    checkCreateSessionBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a missing data blob with a 400', () => {
    const req = { body: { eventId: 1 } };
    const { res } = buildRes();
    const next = jest.fn();

    checkCreateSessionBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  /**
   * Drift guard: the frontend narrows each save to one role's keys, so the
   * server allowlist must stay a superset of all of them. A key stripped here
   * is silently discarded on save, and because updateSession merges over the
   * stored blob the loss is invisible until the user reloads the form.
   *
   * The lists are read out of the frontend's sessionKeys.json rather than
   * copied, so adding a key there without declaring it in sessionDataSchema
   * fails this test. Resolved from process.cwd() (the repo root under both
   * `yarn test` and bin/test-backend-ci) because `yarn test` runs the compiled
   * copy of this file out of build/server/src, where a relative path to the
   * frontend tree would not resolve.
   */
  it('declares every key the session form can send', () => {
    const sessionKeys = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), 'frontend/src/pages/SessionForm/sessionKeys.json'),
        'utf8'
      )
    );

    const frontendKeys = [
      ...new Set([
        ...sessionKeys.defaultKeys,
        ...sessionKeys.istOnlyKeys,
        ...sessionKeys.pocOnlyKeys,
        // Added by onFormSubmit in frontend/src/pages/SessionForm/index.js
        // after reduceDataToMatchKeys has already narrowed the payload, so they
        // are not in any of the role lists.
        ...sessionKeys.submitTimeKeys,
      ]),
    ];

    const declared = Object.keys(sessionDataSchema.describe().keys);
    const missing = frontendKeys.filter((key) => !declared.includes(key));

    expect(missing).toEqual([]);
  });
});
