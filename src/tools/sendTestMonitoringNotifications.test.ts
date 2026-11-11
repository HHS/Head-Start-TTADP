import { EMAIL_ACTIONS } from '../constants';
import { notifyDigest, notifyMonitoringDetailsAdded } from '../lib/mailer';
import db from '../models';
import { monitoringReportsDeliveredInRegionByDate } from '../services/monitoringDeliveries';
import {
  assertLowerEnvironment,
  sendTestMonitoringNotifications,
} from './sendTestMonitoringNotifications';

jest.mock('../lib/mailer', () => ({
  ...jest.requireActual('../lib/mailer'),
  notifyMonitoringDetailsAdded: jest.fn(),
  notifyDigest: jest.fn(),
}));

jest.mock('../services/monitoringDeliveries', () => ({
  monitoringReportsDeliveredInRegionByDate: jest.fn(),
}));

const mockImmediate = notifyMonitoringDetailsAdded as jest.Mock;
const mockDigest = notifyDigest as jest.Mock;
const mockFetcher = monitoringReportsDeliveredInRegionByDate as jest.Mock;

describe('assertLowerEnvironment', () => {
  it.each([
    'https://tta-smarthub-dev-blue.app.cloud.gov',
    'https://tta-smarthub-dev-red.app.cloud.gov',
    'https://tta-smarthub-staging.app.cloud.gov',
    'http://localhost:3000',
  ])('allows %s', (uri) => {
    expect(() => assertLowerEnvironment({ TTA_SMART_HUB_URI: uri })).not.toThrow();
  });

  it.each([
    ['production', 'https://ttahub.ohs.acf.hhs.gov'],
    ['the production cloud.gov app', 'https://tta-smarthub-prod1.app.cloud.gov'],
    ['a missing URI', undefined],
    ['a malformed URI', 'not a url'],
    ['a look-alike host', 'https://tta-smarthub-staging.app.cloud.gov.example.com'],
  ])('refuses %s', (_label, uri) => {
    expect(() => assertLowerEnvironment({ TTA_SMART_HUB_URI: uri })).toThrow('Refusing');
  });

  it('refuses a prod space even with an allowed URI', () => {
    expect(() =>
      assertLowerEnvironment({
        TTA_SMART_HUB_URI: 'https://tta-smarthub-staging.app.cloud.gov',
        SPACE: 'ttahub-prod',
      })
    ).toThrow('Refusing');
  });

  it('refuses localhost when running on cloud.gov', () => {
    expect(() =>
      assertLowerEnvironment({ TTA_SMART_HUB_URI: 'http://localhost:3000', VCAP_APPLICATION: '{}' })
    ).toThrow('Refusing');
  });
});

describe('sendTestMonitoringNotifications', () => {
  const oldEnv = { ...process.env };
  const review = {
    id: 42,
    mrid: 4200,
    review_name: 'Review 4200',
    grants: [
      { id: 1, regionId: 3, recipientId: 500, recipient: { name: 'Zeta Start' } },
      { id: 2, regionId: 3, recipientId: 500, recipient: { name: 'Zeta Start' } },
      { id: 3, regionId: 3, recipientId: 600, recipient: { name: 'Alpha Start' } },
    ],
  };
  const user = { id: 7, name: 'Tester', email: 'tester@test.gov' };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TTA_SMART_HUB_URI = 'https://tta-smarthub-staging.app.cloud.gov';
    process.env.SEND_NOTIFICATIONS = 'true';
    delete process.env.SPACE;
    delete process.env.VCAP_APPLICATION;
    jest.spyOn(db.User, 'findAll').mockResolvedValue([user]);
    jest.spyOn(db.DeliveredReview, 'findOne').mockResolvedValue(review);
    mockImmediate.mockResolvedValue({ messageId: 'x' });
    mockDigest.mockResolvedValue({ messageId: 'y' });
    mockFetcher.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('refuses to run in production before touching the database', async () => {
    process.env.TTA_SMART_HUB_URI = 'https://ttahub.ohs.acf.hhs.gov';
    await expect(
      sendTestMonitoringNotifications({ userIds: [7], type: 'both', freq: 'DAILY' })
    ).rejects.toThrow('Refusing');
    expect(db.User.findAll).not.toHaveBeenCalled();
    expect(mockImmediate).not.toHaveBeenCalled();
    expect(mockDigest).not.toHaveBeenCalled();
  });

  it('requires SEND_NOTIFICATIONS', async () => {
    process.env.SEND_NOTIFICATIONS = 'false';
    await expect(
      sendTestMonitoringNotifications({ userIds: [7], type: 'both', freq: 'DAILY' })
    ).rejects.toThrow('SEND_NOTIFICATIONS');
  });

  it('reports unknown users', async () => {
    await expect(
      sendTestMonitoringNotifications({ userIds: [7, 8], type: 'both', freq: 'DAILY' })
    ).rejects.toThrow('Users not found: 8');
  });

  it('sends one immediate email per recipient on the review', async () => {
    const results = await sendTestMonitoringNotifications({
      userIds: [7],
      type: 'immediate',
      freq: 'DAILY',
    });

    expect(mockImmediate).toHaveBeenCalledTimes(2);
    expect(mockImmediate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user,
        recipientId: 500,
        recipientName: 'Zeta Start',
        regionId: 3,
        report: { id: 42, displayId: 'monitoring report for Zeta Start' },
      }),
    });
    expect(mockDigest).not.toHaveBeenCalled();
    expect(results.every(({ sent, kind }) => sent && kind === 'immediate')).toBe(true);
  });

  it('falls back to the review’s recipients when the user has no digest data', async () => {
    const results = await sendTestMonitoringNotifications({
      userIds: [7],
      type: 'digest',
      freq: 'WEEKLY',
    });

    expect(mockFetcher).toHaveBeenCalledWith(7, "NOW() - INTERVAL '1 WEEK'");
    expect(mockDigest).toHaveBeenCalledWith({
      data: {
        user,
        reports: [
          { id: 600, displayId: 'Alpha Start', regionId: 3 },
          { id: 500, displayId: 'Zeta Start', regionId: 3 },
        ],
        type: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
        freq: 'this week',
        subjectFreq: 'weekly',
      },
    });
    expect(results).toEqual([expect.objectContaining({ kind: 'digest', sent: true })]);
  });

  it('uses the user’s digest data when there is some', async () => {
    mockFetcher.mockResolvedValue([{ id: 900, displayId: 'Real Recipient' }]);

    await sendTestMonitoringNotifications({ userIds: [7], type: 'digest', freq: 'MONTHLY' });

    expect(mockDigest).toHaveBeenCalledWith({
      data: expect.objectContaining({ reports: [{ id: 900, displayId: 'Real Recipient' }] }),
    });
  });

  it('passes a requested review id through and errors when it is not found', async () => {
    const findOneSpy = jest.spyOn(db.DeliveredReview, 'findOne').mockResolvedValue(null);

    await expect(
      sendTestMonitoringNotifications({
        userIds: [7],
        type: 'both',
        freq: 'DAILY',
        deliveredReviewId: 99,
      })
    ).rejects.toThrow('Delivered review 99 not found');
    expect((findOneSpy.mock.calls[0][0] as { where: { id: number } }).where.id).toBe(99);
  });
});
