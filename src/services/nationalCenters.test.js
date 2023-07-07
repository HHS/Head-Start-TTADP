import db from '../models';
import {
  findAll,
  create,
  updateById,
  deleteById,
} from './nationalCenters';
import { auditLogger } from '../logger';

jest.spyOn(auditLogger, 'info');

describe('nationalCenters service', () => {
  afterAll(() => {
    db.sequelize.close();
  });

  describe('findAll', () => {
    let centers;
    beforeAll(async () => {
      centers = await db.NationalCenter.bulkCreate([
        { name: 'National Center 1' },
        { name: 'National Center 2' },
      ]);
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: centers.map((center) => center.id),
        },
        force: true,
      });
    });

    it('returns all nationalCenters', async () => {
      const results = await findAll();

      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((center) => center.name);
      expect(names).toContain('National Center 1');
      expect(names).toContain('National Center 2');
    });
  });

  describe('create', () => {
    let center;
    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: center.id,
        },
        force: true,
      });
    });

    it('creates a nationalCenter', async () => {
      center = await create({ name: 'National Center 1' });

      expect(center.name).toBe('National Center 1');
    });
  });

  describe('updateById', () => {
    let center;
    const ids = [];
    beforeAll(async () => {
      center = await db.NationalCenter.create({ name: 'National Center 1' });
      ids.push(center.id);
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: ids,
        },
        force: true,
      });
    });

    it('updates a nationalCenter', async () => {
      center = await updateById(center.id, { name: 'National Center 2' });
      ids.push(center.id);
      expect(center.name).toBe('National Center 2');
    });

    it('doesn\'t update if name hasn\'t changed', async () => {
      center = await updateById(center.id, { name: 'National Center 2' });
      ids.push(center.id);
      expect(center.name).toBe('National Center 2');
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed`,
      );
    });
  });

  describe('deleteById', () => {
    let center;
    beforeAll(async () => {
      center = await db.NationalCenter.create({ name: 'National Center 1' });
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: center.id,
        },
        force: true,
      });
    });

    it('deletes a nationalCenter', async () => {
      await deleteById(center.id);
      const results = await db.NationalCenter.findAll({
        where: {
          id: center.id,
        },
      });
      expect(results.length).toBe(0);
    });
  });
});
