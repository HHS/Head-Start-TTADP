import { APPROVER_STATUSES } from '@ttahub/common';
import {
  checkReviewReportBody,
  checkSaveOtherEntityObjectivesCitationBody,
  checkSaveReportCitationBody,
} from './middleware';
import { auditLogger } from '../../logger';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

describe('activityReports reviewReport middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls next for a valid approved review payload', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
        approvedAtTimezone: 'America/New_York',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when approved status is missing approvedAtTimezone', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid approvedAtTimezone', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
        approvedAtTimezone: 'Mars/Olympus_Mons',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('allows note & approvedAtTimezone to be omitted for needs action payloads', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.NEEDS_ACTION,
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', () => {
    const req = {
      body: {
        status: 'draft',
        note: 123,
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('activityReports saveReport citation middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls next when the request has no goals payload', () => {
    const req = {
      body: {
        additionalNotes: 'No goals update in this save',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveReportCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for a valid citation payload', () => {
    const req = {
      body: {
        goals: [
          {
            objectives: [
              {
                citations: [
                  {
                    citation: '78',
                    monitoringReferences: [
                      {
                        grantId: 1,
                        findingId: 'abc-123',
                        grantNumber: '90AB1234',
                        reviewName: 'Monitoring review',
                        standardId: 1001,
                        findingType: 'Deficiency',
                        findingSource: 'OHS',
                        acro: 'ACF',
                        severity: 1,
                        reportDeliveryDate: '2024-01-01',
                        monitoringFindingStatusName: 'Active',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveReportCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for citation payloads with a citation name and blank finding source', () => {
    const req = {
      body: {
        goals: [
          {
            objectives: [
              {
                citations: [
                  {
                    id: 200340,
                    name: 'DEF - 1302.90(c)(1)(ii) - ',
                    monitoringReferences: [
                      {
                        acro: 'DEF',
                        citation: '1302.90(c)(1)(ii)',
                        findingId: '2AC737B1-8225-4282-87AD-6A34AC6A46FC',
                        findingSource: '',
                        findingType: 'Deficiency',
                        grantId: 15191,
                        grantNumber: '05CH012496',
                        monitoringFindingStatusName: 'Active',
                        name: 'DEF - 1302.90(c)(1)(ii) - ',
                        reportDeliveryDate: '2026-03-05T05:00:00+00:00',
                        reviewName: '265080RAN',
                        severity: 1,
                        standardId: 200340,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveReportCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when citation is missing required fields', () => {
    const req = {
      body: {
        goals: [
          {
            objectives: [
              {
                citations: [
                  {
                    monitoringReferences: [
                      {
                        grantId: 1,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveReportCitationBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when monitoring reference grantId is invalid', () => {
    const req = {
      body: {
        goals: [
          {
            objectives: [
              {
                citations: [
                  {
                    citation: '78',
                    monitoringReferences: [
                      {
                        grantId: 'abc',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveReportCitationBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  const fullMonitoringReference = {
    grantId: 1,
    findingId: 'abc-123',
    grantNumber: '90AB1234',
    reviewName: 'Monitoring review',
    standardId: 1001,
    findingType: 'Deficiency',
    findingSource: 'OHS',
    acro: 'ACF',
    severity: 1,
    reportDeliveryDate: '2024-01-01',
    monitoringFindingStatusName: 'Active',
  };

  const requiredMonitoringReferenceFields = [
    'findingId',
    'grantNumber',
    'reviewName',
    'standardId',
    'findingType',
    'acro',
    'severity',
    'reportDeliveryDate',
    'monitoringFindingStatusName',
  ];

  requiredMonitoringReferenceFields.forEach((field) => {
    it(`returns 400 when monitoring reference is missing required field: ${field}`, () => {
      const monitoringReference = { ...fullMonitoringReference };
      delete monitoringReference[field];

      const req = {
        body: {
          goals: [
            {
              objectives: [
                {
                  citations: [
                    {
                      citation: '78',
                      monitoringReferences: [monitoringReference],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const send = jest.fn();
      const res = {
        status: jest.fn(() => ({ send })),
      };
      const next = jest.fn();

      checkSaveReportCitationBody(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(send).toHaveBeenCalled();
      expect(auditLogger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('activityReports other-entity objective citation middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const validMonitoringReference = {
    grantId: 1,
    findingId: 'abc-123',
    grantNumber: '90AB1234',
    reviewName: 'Monitoring review',
    standardId: 1001,
    findingType: 'Deficiency',
    findingSource: 'OHS',
    acro: 'ACF',
    severity: 1,
    reportDeliveryDate: '2024-01-01',
    monitoringFindingStatusName: 'Active',
  };

  it('calls next when the request has no objectivesWithoutGoals payload', () => {
    const req = {
      body: {
        activityReportId: 1,
        region: 1,
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveOtherEntityObjectivesCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for valid objectivesWithoutGoals citations payload', () => {
    const req = {
      body: {
        objectivesWithoutGoals: [{
          citations: [{
            citation: '78',
            monitoringReferences: [validMonitoringReference],
          }],
        }],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveOtherEntityObjectivesCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when objectivesWithoutGoals citations monitoring reference is malformed', () => {
    const req = {
      body: {
        objectivesWithoutGoals: [{
          citations: [{
            citation: '78',
            monitoringReferences: [null],
          }],
        }],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveOtherEntityObjectivesCitationBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for objectivesWithoutGoals citations with a citation name and blank finding source', () => {
    const req = {
      body: {
        objectivesWithoutGoals: [{
          citations: [{
            id: 200340,
            name: 'DEF - 1302.90(c)(1)(ii) - ',
            monitoringReferences: [{
              acro: 'DEF',
              citation: '1302.90(c)(1)(ii)',
              findingId: '2AC737B1-8225-4282-87AD-6A34AC6A46FC',
              findingSource: '',
              findingType: 'Deficiency',
              grantId: 15191,
              grantNumber: '05CH012496',
              monitoringFindingStatusName: 'Active',
              name: 'DEF - 1302.90(c)(1)(ii) - ',
              reportDeliveryDate: '2026-03-05T05:00:00+00:00',
              reviewName: '265080RAN',
              severity: 1,
              standardId: 200340,
            }],
          }],
        }],
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkSaveOtherEntityObjectivesCitationBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
