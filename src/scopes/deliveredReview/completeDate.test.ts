import { Op } from 'sequelize';
import db from '../../models';
import { afterCompleteDate, beforeCompleteDate, withinCompleteDates } from './completeDate';

const { DeliveredReview } = db;

describe('deliveredReview/completeDate', () => {
  let januaryReview;
  let earlyFebruaryReview;
  let lateFebruaryReview;
  let marchReview;
  let aprilReview;

  const findDeliveredReviewIds = async (where) => {
    const fixtureIds = [
      januaryReview.id,
      earlyFebruaryReview.id,
      lateFebruaryReview.id,
      marchReview.id,
      aprilReview.id,
    ];
    const deliveredReviews = await DeliveredReview.findAll({
      where: {
        [Op.and]: [where, { id: { [Op.in]: fixtureIds } }],
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return deliveredReviews.map((review) => review.id);
  };

  beforeAll(async () => {
    const mridSeed = Math.floor(Math.random() * 1_000_000_000);

    januaryReview = await DeliveredReview.create({
      mrid: mridSeed,
      complete_date: '2025-01-31',
    });
    earlyFebruaryReview = await DeliveredReview.create({
      mrid: mridSeed + 1,
      complete_date: '2025-02-03',
    });
    lateFebruaryReview = await DeliveredReview.create({
      mrid: mridSeed + 2,
      complete_date: '2025-02-28',
    });
    marchReview = await DeliveredReview.create({
      mrid: mridSeed + 3,
      complete_date: '2025-03-04',
    });
    aprilReview = await DeliveredReview.create({
      mrid: mridSeed + 4,
      complete_date: '2025-04-01',
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

  describe('beforeCompleteDate', () => {
    it('interprets month-only and full-date inputs against persisted delivered reviews', async () => {
      await expect(
        findDeliveredReviewIds(beforeCompleteDate(['2025/02', '2/3/2025']))
      ).resolves.toEqual([januaryReview.id, earlyFebruaryReview.id, lateFebruaryReview.id]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(
        findDeliveredReviewIds(beforeCompleteDate(['not-a-date', '2025/02/30', '2025/02']))
      ).resolves.toEqual([januaryReview.id, earlyFebruaryReview.id, lateFebruaryReview.id]);
    });
  });

  describe('afterCompleteDate', () => {
    it('interprets month-only and full-date inputs against persisted delivered reviews', async () => {
      await expect(
        findDeliveredReviewIds(afterCompleteDate(['2025/02', '2/3/2025']))
      ).resolves.toEqual([
        earlyFebruaryReview.id,
        lateFebruaryReview.id,
        marchReview.id,
        aprilReview.id,
      ]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(
        findDeliveredReviewIds(afterCompleteDate(['', '2025/13', '2025/02']))
      ).resolves.toEqual([
        earlyFebruaryReview.id,
        lateFebruaryReview.id,
        marchReview.id,
        aprilReview.id,
      ]);
    });
  });

  describe('withinCompleteDates', () => {
    it('interprets month-only inputs as the start and end of month when querying', async () => {
      await expect(
        findDeliveredReviewIds(withinCompleteDates(['2025/02-2025/03']))
      ).resolves.toEqual([earlyFebruaryReview.id, lateFebruaryReview.id, marchReview.id]);
    });

    it('interprets valid full-date inputs when querying', async () => {
      await expect(
        findDeliveredReviewIds(withinCompleteDates(['2/3/2025-3/4/2025']))
      ).resolves.toEqual([earlyFebruaryReview.id, lateFebruaryReview.id, marchReview.id]);
    });

    it('omits invalid inputs from produced clauses', async () => {
      await expect(
        findDeliveredReviewIds(
          withinCompleteDates([
            '2025/02-2025/03',
            'not-a-range',
            '2025/02/30-2025/03/01',
            '2025/04-',
          ])
        )
      ).resolves.toEqual([earlyFebruaryReview.id, lateFebruaryReview.id, marchReview.id]);
    });
  });
});
