import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { withoutRegionId, withRegionId } from './regionId';

describe('deliveredReview/regionId', () => {
  const expectLiteralInClause = (literal: unknown, regions: number[]) => {
    expect(literal).toBeInstanceOf(Object);
    const val = (literal as { val: string }).val;
    expect(val).toContain('"DeliveredReviewCitations"');
    expect(val).toContain('"GrantCitations"');
    expect(val).toContain('region_id');
    regions.forEach((r) => expect(val).toContain(String(r)));
  };

  describe('withRegionId', () => {
    it('returns {} for an empty array', () => {
      expect(withRegionId([])).toEqual({});
    });

    it('returns {} when all values are non-numeric strings', () => {
      expect(withRegionId(['abc', 'not-a-number', 'xyz'])).toEqual({});
    });

    it('returns {} for Infinity, -Infinity, and NaN strings', () => {
      expect(withRegionId(['Infinity', '-Infinity', 'NaN'])).toEqual({});
    });

    it('returns {} for zero and negative integers', () => {
      expect(withRegionId(['0', '-1', '-5'])).toEqual({});
    });

    it('returns {} for non-integer floats', () => {
      expect(withRegionId(['1.5', '2.9', '3.1'])).toEqual({});
    });

    it('filters out Infinity and negatives, keeping only valid positive integers', () => {
      const result = withRegionId(['1', 'Infinity', '-1', '0', '2.5', '3']);
      expect(result).toHaveProperty('id');
      const inClause = (result as { id: { [key: symbol]: unknown } }).id[Op.in];
      expectLiteralInClause(inClause, [1, 3]);
      const val = (inClause as { val: string }).val;
      expect(val).not.toContain('Infinity');
      expect(val).not.toContain('-1');
      expect(val).not.toContain('2.5');
    });

    it('filters out non-numeric values and uses only valid regions', () => {
      const result = withRegionId(['1', 'abc', '3']);
      expect(result).toHaveProperty('id');
      const inClause = (result as { id: { [key: symbol]: unknown } }).id[Op.in];
      expectLiteralInClause(inClause, [1, 3]);
      const val = (inClause as { val: string }).val;
      expect(val).not.toContain('abc');
    });

    it('returns an Op.in clause with a literal subquery for valid numeric strings', () => {
      const result = withRegionId(['5', '6']);
      expect(result).toHaveProperty('id');
      const inClause = (result as { id: { [key: symbol]: unknown } }).id[Op.in];
      expect(inClause).toEqual(sequelize.literal(expect.any(String) as unknown as string));
      expectLiteralInClause(inClause, [5, 6]);
    });

    it('handles a single valid region', () => {
      const result = withRegionId(['2']);
      const inClause = (result as { id: { [key: symbol]: unknown } }).id[Op.in];
      expectLiteralInClause(inClause, [2]);
    });
  });

  describe('withoutRegionId', () => {
    it('returns {} for an empty array', () => {
      expect(withoutRegionId([])).toEqual({});
    });

    it('returns {} when all values are non-numeric strings', () => {
      expect(withoutRegionId(['xyz', 'NaN'])).toEqual({});
    });

    it('returns {} for Infinity, -Infinity, and NaN strings', () => {
      expect(withoutRegionId(['Infinity', '-Infinity', 'NaN'])).toEqual({});
    });

    it('returns {} for zero and negative integers', () => {
      expect(withoutRegionId(['0', '-3'])).toEqual({});
    });

    it('returns {} for non-integer floats', () => {
      expect(withoutRegionId(['4.2', '5.7'])).toEqual({});
    });

    it('filters out Infinity and negatives, keeping only valid positive integers', () => {
      const result = withoutRegionId(['2', 'Infinity', '-2', '0', '1.5', '4']);
      expect(result).toHaveProperty('id');
      const notInClause = (result as { id: { [key: symbol]: unknown } }).id[Op.notIn];
      expectLiteralInClause(notInClause, [2, 4]);
      const val = (notInClause as { val: string }).val;
      expect(val).not.toContain('Infinity');
      expect(val).not.toContain('-2');
      expect(val).not.toContain('1.5');
    });

    it('filters out non-numeric values and uses only valid regions', () => {
      const result = withoutRegionId(['2', 'bad', '4']);
      expect(result).toHaveProperty('id');
      const notInClause = (result as { id: { [key: symbol]: unknown } }).id[Op.notIn];
      expectLiteralInClause(notInClause, [2, 4]);
      const val = (notInClause as { val: string }).val;
      expect(val).not.toContain('bad');
    });

    it('returns an Op.notIn clause with a literal subquery for valid numeric strings', () => {
      const result = withoutRegionId(['7', '8']);
      expect(result).toHaveProperty('id');
      const notInClause = (result as { id: { [key: symbol]: unknown } }).id[Op.notIn];
      expect(notInClause).toEqual(sequelize.literal(expect.any(String) as unknown as string));
      expectLiteralInClause(notInClause, [7, 8]);
    });

    it('handles a single valid region', () => {
      const result = withoutRegionId(['9']);
      const notInClause = (result as { id: { [key: symbol]: unknown } }).id[Op.notIn];
      expectLiteralInClause(notInClause, [9]);
    });
  });
});
