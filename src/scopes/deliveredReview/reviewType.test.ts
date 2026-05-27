import { Op } from 'sequelize';
import db from '../../models';
import { withoutReviewTypes, withReviewType } from './reviewType';

const { DeliveredReview } = db;

describe('deliveredReview/reviewType', () => {
  let fa1Review;
  let classReview;
  let fa2CrReview;
  let followUpReview;
  let ranReview;

  const findDeliveredReviewIds = async (where) => {
    const reviews = await DeliveredReview.findAll({
      where,
      attributes: ['id'],
      order: [['id', 'ASC']],
    });
    return reviews.map((r) => r.id);
  };

  beforeAll(async () => {
    const mridSeed = Math.floor(Math.random() * 1_000_000_000);

    fa1Review = await DeliveredReview.create({
      mrid: mridSeed,
      review_type: 'FA-1',
    });
    classReview = await DeliveredReview.create({
      mrid: mridSeed + 1,
      review_type: 'CLASS',
    });
    fa2CrReview = await DeliveredReview.create({
      mrid: mridSeed + 2,
      review_type: 'FA2-CR',
    });
    followUpReview = await DeliveredReview.create({
      mrid: mridSeed + 3,
      review_type: 'Follow-up',
    });
    ranReview = await DeliveredReview.create({
      mrid: mridSeed + 4,
      review_type: 'RAN',
    });
  });

  afterAll(async () => {
    await DeliveredReview.destroy({
      where: {
        id: [
          fa1Review?.id,
          classReview?.id,
          fa2CrReview?.id,
          followUpReview?.id,
          ranReview?.id,
        ].filter(Boolean),
      },
      force: true,
    });
  });

  describe('withReviewType', () => {
    it('returns matching reviews for a single valid type', async () => {
      const ids = await findDeliveredReviewIds(withReviewType(['FA-1']));
      expect(ids).toContain(fa1Review.id);
      expect(ids).not.toContain(classReview.id);
      expect(ids).not.toContain(fa2CrReview.id);
    });

    it('returns matching reviews for multiple valid types', async () => {
      const ids = await findDeliveredReviewIds(withReviewType(['FA-1', 'CLASS']));
      expect(ids).toContain(fa1Review.id);
      expect(ids).toContain(classReview.id);
      expect(ids).not.toContain(fa2CrReview.id);
      expect(ids).not.toContain(followUpReview.id);
    });

    it('passes through arbitrary non-empty strings (no allowlist)', async () => {
      const ids = await findDeliveredReviewIds(withReviewType(['RAN']));
      expect(ids).toContain(ranReview.id);
      expect(ids).not.toContain(fa1Review.id);
    });

    it('filters out empty and whitespace-only strings', async () => {
      const ids = await findDeliveredReviewIds(withReviewType(['', '   ', 'FA-1']));
      expect(ids).toContain(fa1Review.id);
      expect(ids).not.toContain(classReview.id);
    });

    it('returns no matches for an empty array', async () => {
      const ids = await findDeliveredReviewIds(withReviewType([]));
      expect(ids).not.toContain(fa1Review.id);
      expect(ids).not.toContain(classReview.id);
    });

    it('caps the array at 50 values', async () => {
      const manyTypes = Array.from({ length: 60 }, (_, i) => `type-${i}`);
      const where = withReviewType(manyTypes);
      const inValues = where.review_type[Op.in];
      expect(inValues).toHaveLength(50);
    });
  });

  describe('withoutReviewTypes', () => {
    it('excludes reviews with the specified type', async () => {
      const ids = await findDeliveredReviewIds(withoutReviewTypes(['FA-1']));
      expect(ids).not.toContain(fa1Review.id);
      expect(ids).toContain(classReview.id);
      expect(ids).toContain(fa2CrReview.id);
    });

    it('excludes reviews for multiple specified types', async () => {
      const ids = await findDeliveredReviewIds(withoutReviewTypes(['FA-1', 'CLASS', 'FA2-CR']));
      expect(ids).not.toContain(fa1Review.id);
      expect(ids).not.toContain(classReview.id);
      expect(ids).not.toContain(fa2CrReview.id);
      expect(ids).toContain(followUpReview.id);
      expect(ids).toContain(ranReview.id);
    });

    it('filters out empty/whitespace strings and returns all test reviews', async () => {
      const ids = await findDeliveredReviewIds(withoutReviewTypes(['', '   ']));
      expect(ids).toContain(fa1Review.id);
      expect(ids).toContain(classReview.id);
      expect(ids).toContain(fa2CrReview.id);
    });

    it('returns all test reviews for an empty array', async () => {
      const ids = await findDeliveredReviewIds(withoutReviewTypes([]));
      expect(ids).toContain(fa1Review.id);
      expect(ids).toContain(classReview.id);
      expect(ids).toContain(fa2CrReview.id);
      expect(ids).toContain(followUpReview.id);
      expect(ids).toContain(ranReview.id);
    });
  });
});
