import db from '../..';

const {
  Grant,
  MonitoringClassSummary,
  MonitoringReview,
  MonitoringReviewLink,
} = db;

describe('MonitoringClassSummary', () => {
  it('findOne', async () => {
    const data = await MonitoringClassSummary.findOne({
      include: [{
        as: 'monitoringReviewLink',
        model: MonitoringReviewLink,
        include: [{
          as: 'monitoringReviews',
          model: MonitoringReview,
        }],
      }],
      attributes: ['grantNumber'],
    });
    expect(data).toBe(true);
  });
});
