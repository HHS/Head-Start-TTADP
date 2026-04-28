import db from '../../models';
import {
  beforeReportDeliveryDate,
  afterReportDeliveryDate,
  withinReportDeliveryDates,
} from './reportDeliveryDate';

const { DeliveredReview } = db;

describe('deliveredReview/reportDeliveryDate', () => {
  let januaryReview;
  let earlyFebruaryReview;
  let lateFebruaryReview;
  let marchReview;
  let aprilReview;

  const findDeliveredReviewIds = async (where) => {
    const deliveredReviews = await DeliveredReview.findAll({
      where,
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return deliveredReviews.map((review) => review.id);
  };

  beforeAll(async () => {
    const mridSeed = Math.floor(Math.random() * 1_000_000_000);

    januaryReview = await DeliveredReview.create({
      mrid: mridSeed,
      report_delivery_date: '2025-01-31',
    });
    earlyFebruaryReview = await DeliveredReview.create({
      mrid: mridSeed + 1,
      report_delivery_date: '2025-02-03',
    });
    lateFebruaryReview = await DeliveredReview.create({
      mrid: mridSeed + 2,
      report_delivery_date: '2025-02-28',
    });
    marchReview = await DeliveredReview.create({
      mrid: mridSeed + 3,
      report_delivery_date: '2025-03-04',
    });
    aprilReview = await DeliveredReview.create({
      mrid: mridSeed + 4,
      report_delivery_date: '2025-04-01',
    });
  });

  afterAll(async () => {
    await DeliveredReview.destroy({
      where: {
        id: [
          januaryReview?.id,
          earlyFebruaryReview?.id,
          lateFebruaryReview?.id,
          marchReview?.id,
          aprilReview?.id,
        ].filter(Boolean),
      },
      force: true,
    });
  });

  describe('beforeReportDeliveryDate', () => {
    it('normalizes month-only and full-date inputs against persisted delivered reviews', async () => {
      await expect(findDeliveredReviewIds(beforeReportDeliveryDate(['2025/02', '2/3/2025'])))
        .resolves.toEqual([
          januaryReview.id,
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
        ]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(findDeliveredReviewIds(beforeReportDeliveryDate(['not-a-date', '2025/02/30', '2025/02'])))
        .resolves.toEqual([
          januaryReview.id,
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
        ]);
    });
  });

  describe('afterReportDeliveryDate', () => {
    it('normalizes month-only and full-date inputs against persisted delivered reviews', async () => {
      await expect(findDeliveredReviewIds(afterReportDeliveryDate(['2025/02', '2/3/2025'])))
        .resolves.toEqual([
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
          marchReview.id,
          aprilReview.id,
        ]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(findDeliveredReviewIds(afterReportDeliveryDate(['', '2025/13', '2025/02'])))
        .resolves.toEqual([
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
          marchReview.id,
          aprilReview.id,
        ]);
    });
  });

  describe('withinReportDeliveryDates', () => {
    it('normalizes month-only inputs to start and end of month when querying', async () => {
      await expect(findDeliveredReviewIds(withinReportDeliveryDates(['2025/02-2025/03'])))
        .resolves.toEqual([
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
          marchReview.id,
        ]);
    });

    it('normalizes valid full-date inputs when querying', async () => {
      await expect(findDeliveredReviewIds(withinReportDeliveryDates(['2/3/2025-3/4/2025'])))
        .resolves.toEqual([
          earlyFebruaryReview.id,
          lateFebruaryReview.id,
          marchReview.id,
        ]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(findDeliveredReviewIds(withinReportDeliveryDates([
        '2025/02-2025/03',
        'not-a-range',
        '2025/02/30-2025/03/01',
        '2025/04-',
      ]))).resolves.toEqual([
        earlyFebruaryReview.id,
        lateFebruaryReview.id,
        marchReview.id,
      ]);
    });
  });
});
