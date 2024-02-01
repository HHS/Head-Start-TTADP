import { Sequelize } from 'sequelize';
import db from '../..';
import { nestedRawish } from '../../../lib/modelUtils';

const {
  Grant,
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringReview,
  MonitoringReviewLink,
  Recipient,
} = db;

describe('MonitoringClassSummary', () => {
  it('findAll', async () => {
    const data = await MonitoringClassSummary.findAll({
      include: [
        {
          as: 'monitoringReviewLink',
          model: MonitoringReviewLink,
          attributes: [],
          required: false,
          include: [{
            as: 'monitoringReviews',
            model: MonitoringReview,
            attributes: [],
            required: false,
          }],
        },
        {
          as: 'grantNumberLink',
          model: GrantNumberLink,
          attributes: [],
          required: false,
          include: [{
            as: 'grant',
            model: Grant,
            attributes: [],
            required: false,
          }],
        },
      ],
      attributes: [
        'grantNumber',
        'emotionalSupport',
        'classroomOrganization',
        'instructionalSupport',
        // Use Sequelize.literal to reference nested attributes
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."outcome"`), 'monitoringReviewOutcome'],
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."reviewType"`), 'monitoringReviewType'],
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"grantNumberLink->grant"."status"`), 'grantStatus'],
      ],
      where: { grantNumber: '14CH00002' },
    });
    expect(nestedRawish(data)).toMatchObject([{
      classroomOrganization: '5.2303',
      emotionalSupport: '6.2303',
      grantNumber: '14CH00002',
      grantStatus: 'Active',
      instructionalSupport: '3.2303',
      monitoringReviewOutcome: 'Deficient',
      monitoringReviewType: 'RAN',
    }]);
  });
});
