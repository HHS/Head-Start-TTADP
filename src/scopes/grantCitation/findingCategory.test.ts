import { Op } from 'sequelize';
import { v4 as uuid } from 'uuid';
import db from '../../models';
import { withFindingCategory, withoutFindingCategory } from './findingCategory';

const { Citation, FindingCategory, Grant, GrantCitation, Recipient } = db;

describe('grantCitation/findingCategory', () => {
  let recipient;
  let grant;
  let categoryFiscal;
  let categoryHealth;
  let deletedCategory;
  let fiscalCitation;
  let healthCitation;
  let noCategoryCitation;
  let deletedCategoryCitation;
  let fiscalGrantCitation;
  let healthGrantCitation;
  let noCategoryGrantCitation;
  let deletedCategoryGrantCitation;

  const findGrantCitationIds = async (where) => {
    const grantCitations = await GrantCitation.findAll({
      where: {
        [Op.and]: [
          where,
          {
            id: [
              fiscalGrantCitation?.id,
              healthGrantCitation?.id,
              noCategoryGrantCitation?.id,
              deletedCategoryGrantCitation?.id,
            ].filter(Boolean),
          },
        ],
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });
    return grantCitations.map((gc) => gc.id);
  };

  beforeAll(async () => {
    const seed = Math.floor(Math.random() * 900_000) + 100_000;
    const mfidBase = Math.floor(Math.random() * 1_000_000_000);

    recipient = await Recipient.create({
      id: seed,
      name: `Test Recipient ${seed}`,
      uei: `UEI${seed}`.padEnd(12, '0').slice(0, 12),
    });

    grant = await Grant.create({
      id: seed,
      number: `TEST-GRANT-${seed}`,
      recipientId: recipient.id,
      regionId: 1,
    });

    categoryFiscal = await FindingCategory.create({ name: `Fiscal-${seed}` });
    categoryHealth = await FindingCategory.create({ name: `Health-${seed}` });
    deletedCategory = await FindingCategory.create({ name: `Deleted-${seed}` });
    await deletedCategory.destroy(); // soft-delete via paranoid

    fiscalCitation = await Citation.create({
      mfid: mfidBase,
      finding_uuid: uuid(),
      findingCategoryId: categoryFiscal.id,
    });
    healthCitation = await Citation.create({
      mfid: mfidBase + 1,
      finding_uuid: uuid(),
      findingCategoryId: categoryHealth.id,
    });
    noCategoryCitation = await Citation.create({
      mfid: mfidBase + 2,
      finding_uuid: uuid(),
      findingCategoryId: null,
    });
    deletedCategoryCitation = await Citation.create({
      mfid: mfidBase + 3,
      finding_uuid: uuid(),
      findingCategoryId: deletedCategory.id,
    });

    fiscalGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: fiscalCitation.id,
    });
    healthGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: healthCitation.id,
    });
    noCategoryGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: noCategoryCitation.id,
    });
    deletedCategoryGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: deletedCategoryCitation.id,
    });
  });

  afterAll(async () => {
    await GrantCitation.destroy({
      where: {
        id: [
          fiscalGrantCitation?.id,
          healthGrantCitation?.id,
          noCategoryGrantCitation?.id,
          deletedCategoryGrantCitation?.id,
        ].filter(Boolean),
      },
      force: true,
    });
    await Citation.destroy({
      where: {
        id: [
          fiscalCitation?.id,
          healthCitation?.id,
          noCategoryCitation?.id,
          deletedCategoryCitation?.id,
        ].filter(Boolean),
      },
      force: true,
    });
    await Grant.destroy({ where: { id: grant?.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient?.id }, force: true });
    await FindingCategory.destroy({
      where: { id: [categoryFiscal?.id, categoryHealth?.id].filter(Boolean) },
      force: true,
    });
    // deletedCategory is already soft-deleted; force-destroy it now
    await FindingCategory.destroy({
      where: { id: deletedCategory?.id },
      force: true,
    });
  });

  describe('withFindingCategory', () => {
    it('returns only GrantCitations linked to the specified category', async () => {
      const scope = await withFindingCategory([categoryFiscal.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).not.toContain(healthGrantCitation.id);
      expect(ids).not.toContain(noCategoryGrantCitation.id);
    });

    it('returns GrantCitations for any of multiple valid categories', async () => {
      const scope = await withFindingCategory([categoryFiscal.name, categoryHealth.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
      expect(ids).not.toContain(noCategoryGrantCitation.id);
    });

    it('returns no matches for non-existent category names', async () => {
      const scope = await withFindingCategory(['bogus-category', 'not-real']);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(fiscalGrantCitation.id);
      expect(ids).not.toContain(healthGrantCitation.id);
      expect(ids).not.toContain(noCategoryGrantCitation.id);
    });

    it('ignores soft-deleted categories', async () => {
      const scope = await withFindingCategory([deletedCategory.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(deletedCategoryGrantCitation.id);
    });

    it('returns no matches for an empty array', async () => {
      const scope = await withFindingCategory([]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(fiscalGrantCitation.id);
      expect(ids).not.toContain(healthGrantCitation.id);
      expect(ids).not.toContain(noCategoryGrantCitation.id);
    });

    it('silently drops invalid names and matches only the valid ones', async () => {
      const scope = await withFindingCategory([categoryFiscal.name, 'totally-invalid']);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).not.toContain(healthGrantCitation.id);
    });
  });

  describe('withoutFindingCategory', () => {
    it('excludes GrantCitations linked to the specified category', async () => {
      const scope = await withoutFindingCategory([categoryFiscal.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
      expect(ids).toContain(noCategoryGrantCitation.id);
    });

    it('excludes GrantCitations for any of multiple valid categories', async () => {
      const scope = await withoutFindingCategory([categoryFiscal.name, categoryHealth.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(fiscalGrantCitation.id);
      expect(ids).not.toContain(healthGrantCitation.id);
      expect(ids).toContain(noCategoryGrantCitation.id);
    });

    it('returns all test GrantCitations when category names are non-existent', async () => {
      const scope = await withoutFindingCategory(['bogus-category', 'not-real']);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
      expect(ids).toContain(noCategoryGrantCitation.id);
    });

    it('ignores soft-deleted categories and returns all test GrantCitations', async () => {
      const scope = await withoutFindingCategory([deletedCategory.name]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
      expect(ids).toContain(noCategoryGrantCitation.id);
    });

    it('returns all test GrantCitations for an empty array', async () => {
      const scope = await withoutFindingCategory([]);
      const ids = await findGrantCitationIds(scope);

      expect(ids).toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
      expect(ids).toContain(noCategoryGrantCitation.id);
    });

    it('silently drops invalid names and excludes only the valid ones', async () => {
      const scope = await withoutFindingCategory([categoryFiscal.name, 'totally-invalid']);
      const ids = await findGrantCitationIds(scope);

      expect(ids).not.toContain(fiscalGrantCitation.id);
      expect(ids).toContain(healthGrantCitation.id);
    });
  });
});
