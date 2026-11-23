import { Op } from 'sequelize';
import db from '../models';
import { getRecipientGrantIds } from './trSessionsForRecipient';
import ttaMonitoringReviewPeriods from './ttaMonitoringReviewPeriods';

jest.mock('../models', () => ({
  __esModule: true,
  default: { DeliveredReview: { findAll: jest.fn() }, GrantDeliveredReview: {} },
}));
jest.mock('./trSessionsForRecipient', () => ({ getRecipientGrantIds: jest.fn() }));

describe('ttaMonitoringReviewPeriods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not query reviews without scoped grants', async () => {
    getRecipientGrantIds.mockResolvedValue([]);
    expect(await ttaMonitoringReviewPeriods({})).toEqual([]);
    expect(db.DeliveredReview.findAll).not.toHaveBeenCalled();
  });

  it('returns review dates restricted to scoped grants', async () => {
    getRecipientGrantIds.mockResolvedValue([12, 13]);
    db.DeliveredReview.findAll.mockResolvedValue([
      { report_start_date: '2026-01-03', report_end_date: '2026-01-10' },
    ]);
    expect(await ttaMonitoringReviewPeriods({})).toEqual([
      { startDate: '2026-01-03', endDate: '2026-01-10' },
    ]);
    expect(db.DeliveredReview.findAll.mock.calls[0][0].include[0].where.grantId[Op.in]).toEqual([
      12, 13,
    ]);
  });
});
