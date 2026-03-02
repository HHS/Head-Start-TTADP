import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { beforeLastTTA, afterLastTTA, withinLastTTA } from './lastTTA';

describe('grants/lastTTA', () => {
  describe('beforeLastTTA', () => {
    it('returns correct query structure for single date', () => {
      const result = beforeLastTTA(['2022/06/20']);

      expect(result).toHaveProperty('where');
      expect(result.where).toHaveProperty('id');
      expect(result.where.id[Op.in]).toBeDefined();

      // Check that the SQL includes the expected date
      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('2022/06/20');
      expect(sql).toContain('MAX(ar."approvedAt")::date <=');
      expect(sql).toContain('calculatedStatus');
      expect(sql).toContain('approved');
    });

    it('handles multiple dates', () => {
      const result = beforeLastTTA(['2022/06/20', '2022/12/31']);

      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('ANY(ARRAY');
      expect(sql).toContain('2022/06/20');
      expect(sql).toContain('2022/12/31');
    });
  });

  describe('afterLastTTA', () => {
    it('returns correct query structure for single date', () => {
      const result = afterLastTTA(['2022/06/20']);

      expect(result).toHaveProperty('where');
      expect(result.where).toHaveProperty('id');
      expect(result.where.id[Op.in]).toBeDefined();

      // Check that the SQL includes the expected date
      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('2022/06/20');
      expect(sql).toContain('MAX(ar."approvedAt")::date >=');
      expect(sql).toContain('calculatedStatus');
      expect(sql).toContain('approved');
    });

    it('handles multiple dates', () => {
      const result = afterLastTTA(['2022/06/20', '2022/12/31']);

      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('ANY(ARRAY');
      expect(sql).toContain('2022/06/20');
      expect(sql).toContain('2022/12/31');
    });
  });

  describe('withinLastTTA', () => {
    it('returns correct query structure for single date range', () => {
      const result = withinLastTTA(['2022/03/01-2022/06/30']);

      expect(result).toHaveProperty('where');
      expect(result.where).toHaveProperty('id');
      expect(result.where.id[Op.in]).toBeDefined();

      // Check that the SQL includes the expected dates
      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('2022/03/01');
      expect(sql).toContain('2022/06/30');
      expect(sql).toContain('MAX(ar."approvedAt")::date >=');
      expect(sql).toContain('MAX(ar."approvedAt")::date <=');
      expect(sql).toContain('calculatedStatus');
      expect(sql).toContain('approved');
    });

    it('handles multiple date ranges with OR logic', () => {
      const result = withinLastTTA(['2022/03/01-2022/03/31', '2022/09/01-2022/09/30']);

      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('2022/03/01');
      expect(sql).toContain('2022/03/31');
      expect(sql).toContain('2022/09/01');
      expect(sql).toContain('2022/09/30');
      expect(sql).toContain(' OR '); // Should have OR for multiple ranges
    });

    it('returns empty where clause when no valid ranges provided', () => {
      const result = withinLastTTA([]);

      expect(result).toEqual({ where: {} });
    });

    it('filters out invalid ranges without dash separator', () => {
      const result = withinLastTTA(['2022/03/01', '2022/06/30']);

      // These don't have dashes, so should be filtered out
      expect(result).toEqual({ where: {} });
    });

    it('handles single date as range (same start and end)', () => {
      const result = withinLastTTA(['2022/03/20-2022/03/20']);

      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('2022/03/20');
      // Should still have both >= and <= checks
      expect(sql).toContain('>=');
      expect(sql).toContain('<=');
    });
  });

  describe('SQL query structure', () => {
    it('all functions query the same tables', () => {
      const beforeSql = beforeLastTTA(['2022/06/20']).where.id[Op.in].val;
      const afterSql = afterLastTTA(['2022/06/20']).where.id[Op.in].val;
      const withinSql = withinLastTTA(['2022/06/01-2022/06/30']).where.id[Op.in].val;

      // All should join the same tables
      [beforeSql, afterSql, withinSql].forEach((sql) => {
        expect(sql).toContain('FROM "Grants" g');
        expect(sql).toContain('INNER JOIN "Goals" goals');
        expect(sql).toContain('INNER JOIN "ActivityReportGoals" arg');
        expect(sql).toContain('INNER JOIN "ActivityReports" ar');
        expect(sql).toContain('GROUP BY g.id, g."recipientId"');
      });
    });

    it('all functions filter by approved status', () => {
      const beforeSql = beforeLastTTA(['2022/06/20']).where.id[Op.in].val;
      const afterSql = afterLastTTA(['2022/06/20']).where.id[Op.in].val;
      const withinSql = withinLastTTA(['2022/06/01-2022/06/30']).where.id[Op.in].val;

      [beforeSql, afterSql, withinSql].forEach((sql) => {
        expect(sql).toContain('WHERE ar."calculatedStatus" = \'approved\'');
      });
    });

    it('all functions use MAX aggregate for lastTTA', () => {
      const beforeSql = beforeLastTTA(['2022/06/20']).where.id[Op.in].val;
      const afterSql = afterLastTTA(['2022/06/20']).where.id[Op.in].val;
      const withinSql = withinLastTTA(['2022/06/01-2022/06/30']).where.id[Op.in].val;

      [beforeSql, afterSql, withinSql].forEach((sql) => {
        expect(sql).toContain('MAX(ar."approvedAt")');
      });
    });
  });
});
