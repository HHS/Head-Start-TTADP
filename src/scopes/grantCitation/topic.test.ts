import { Op } from 'sequelize';
import db from '../../models';
import { withoutTopics, withTopics } from './topic';

describe('grantCitation/topic', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  const validTopics = new Set(['Coaching', 'ERSEA']);

  describe('withTopics', () => {
    it('restricts citationId to a subquery scoped to the requested valid topics', () => {
      const where = withTopics(['Coaching'], {}, 1, validTopics);
      const literal = where.citationId[Op.in].val;

      expect(literal).toContain('SELECT DISTINCT aroc."citationId"');
      expect(literal).toContain("t.name IN ('Coaching')");
    });

    it('drops topics that are not in the valid topics set', () => {
      const where = withTopics(['Coaching', 'Not A Real Topic'], {}, 1, validTopics);
      const literal = where.citationId[Op.in].val;

      expect(literal).toContain("t.name IN ('Coaching')");
      expect(literal).not.toContain('Not A Real Topic');
    });

    it('returns an empty match when no valid topics remain', () => {
      expect(withTopics(['Not A Real Topic'], {}, 1, validTopics)).toEqual({
        citationId: { [Op.in]: [] },
      });
    });

    it('returns an empty match when validTopics is not provided', () => {
      expect(withTopics(['Coaching'], {}, 1, undefined)).toEqual({
        citationId: { [Op.in]: [] },
      });
    });
  });

  describe('withoutTopics', () => {
    it('excludes citationId matching a subquery scoped to the requested valid topics', () => {
      const where = withoutTopics(['ERSEA'], {}, 1, validTopics);
      const literal = where.citationId[Op.notIn].val;

      expect(literal).toContain('SELECT DISTINCT aroc."citationId"');
      expect(literal).toContain("t.name IN ('ERSEA')");
    });

    it('returns no filter when no valid topics remain', () => {
      expect(withoutTopics(['Not A Real Topic'], {}, 1, validTopics)).toEqual({});
    });
  });
});
