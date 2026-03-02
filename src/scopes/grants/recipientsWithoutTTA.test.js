import { Op } from 'sequelize';
import { noActivityWithin } from './recipientsWithoutTTA';

describe('grants/recipientsWithoutTTA', () => {
  describe('noActivityWithin', () => {
    it('returns correct query structure', () => {
      const result = noActivityWithin(['2022/03/01-2022/03/31']);

      expect(result).toHaveProperty('where');
      expect(result.where).toHaveProperty('id');
      expect(result.where.id[Op.in]).toBeDefined();
    });

    it('includes the date range in the SQL', () => {
      const result = noActivityWithin(['2022/03/01-2022/03/31']);
      const sql = result.where.id[Op.in].val;

      expect(sql).toContain('2022/03/01');
      expect(sql).toContain('2022/03/31');
    });

    it('filters by approved status', () => {
      const result = noActivityWithin(['2022/03/01-2022/03/31']);
      const sql = result.where.id[Op.in].val;

      expect(sql).toContain('ar."calculatedStatus" = \'approved\'');
    });

    it('queries the expected tables', () => {
      const result = noActivityWithin(['2022/03/01-2022/03/31']);
      const sql = result.where.id[Op.in].val;

      expect(sql).toContain('FROM "Grants" g');
      expect(sql).toContain('JOIN "ActivityRecipients" arr');
      expect(sql).toContain('JOIN "ActivityReports" ar');
    });

    it('excludes recipients with approved activity in range using NOT IN', () => {
      const result = noActivityWithin(['2022/03/01-2022/03/31']);
      const sql = result.where.id[Op.in].val;

      expect(sql).toContain('NOT IN');
    });
  });
});
