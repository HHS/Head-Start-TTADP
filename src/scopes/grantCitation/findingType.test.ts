import { v4 as uuid } from 'uuid';
import db from '../../models';
import { withFindingType, withoutFindingType } from './findingType';

const { Citation, Grant, GrantCitation, Recipient } = db;

describe('grantCitation/findingType', () => {
  let recipient;
  let grant;
  let aocCitation;
  let noncomplianceCitation;
  let deficiencyCitation;
  let aocGrantCitation;
  let noncomplianceGrantCitation;
  let deficiencyGrantCitation;

  const findGrantCitationIds = async (where) => {
    const grantCitations = await GrantCitation.findAll({
      where: {
        grantId: grant?.id,
        ...where,
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });
    return grantCitations.map((gc) => gc.id);
  };

  beforeAll(async () => {
    const seed = Math.floor(Math.random() * 900_000) + 100_000;

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

    const mfidSeed = Math.floor(Math.random() * 1_000_000_000);

    aocCitation = await Citation.create({
      mfid: mfidSeed,
      finding_uuid: uuid(),
      calculated_finding_type: 'Area of Concern',
    });
    noncomplianceCitation = await Citation.create({
      mfid: mfidSeed + 1,
      finding_uuid: uuid(),
      calculated_finding_type: 'Noncompliance',
    });
    deficiencyCitation = await Citation.create({
      mfid: mfidSeed + 2,
      finding_uuid: uuid(),
      calculated_finding_type: 'Deficiency',
    });

    aocGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: aocCitation.id,
    });
    noncomplianceGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: noncomplianceCitation.id,
    });
    deficiencyGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: deficiencyCitation.id,
    });
  });

  afterAll(async () => {
    await GrantCitation.destroy({
      where: {
        id: [
          aocGrantCitation?.id,
          noncomplianceGrantCitation?.id,
          deficiencyGrantCitation?.id,
        ].filter(Boolean),
      },
      force: true,
    });
    await Citation.destroy({
      where: {
        id: [aocCitation?.id, noncomplianceCitation?.id, deficiencyCitation?.id].filter(Boolean),
      },
      force: true,
    });
    await Grant.destroy({ where: { id: grant?.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient?.id }, force: true });
  });

  describe('withFindingType', () => {
    it('returns only GrantCitations linked to citations with the specified finding type', async () => {
      const ids = await findGrantCitationIds(withFindingType(['Area of Concern']));
      expect(ids).toContain(aocGrantCitation.id);
      expect(ids).not.toContain(noncomplianceGrantCitation.id);
      expect(ids).not.toContain(deficiencyGrantCitation.id);
    });

    it('returns GrantCitations linked to any of multiple specified finding types', async () => {
      const ids = await findGrantCitationIds(withFindingType(['Area of Concern', 'Noncompliance']));
      expect(ids).toContain(aocGrantCitation.id);
      expect(ids).toContain(noncomplianceGrantCitation.id);
      expect(ids).not.toContain(deficiencyGrantCitation.id);
    });

    it('filters out values not in validFindingTypes and returns no matches', async () => {
      const ids = await findGrantCitationIds(withFindingType(['invalid-type', 'bogus']));
      expect(ids).not.toContain(aocGrantCitation.id);
      expect(ids).not.toContain(noncomplianceGrantCitation.id);
      expect(ids).not.toContain(deficiencyGrantCitation.id);
    });

    it('returns no matches for an empty array', async () => {
      const ids = await findGrantCitationIds(withFindingType([]));
      expect(ids).not.toContain(aocGrantCitation.id);
      expect(ids).not.toContain(noncomplianceGrantCitation.id);
      expect(ids).not.toContain(deficiencyGrantCitation.id);
    });
  });

  describe('withoutFindingType', () => {
    it('excludes GrantCitations linked to citations with the specified finding type', async () => {
      const ids = await findGrantCitationIds(withoutFindingType(['Area of Concern']));
      expect(ids).not.toContain(aocGrantCitation.id);
      expect(ids).toContain(noncomplianceGrantCitation.id);
      expect(ids).toContain(deficiencyGrantCitation.id);
    });

    it('excludes GrantCitations linked to any of multiple specified finding types', async () => {
      const ids = await findGrantCitationIds(
        withoutFindingType(['Area of Concern', 'Noncompliance'])
      );
      expect(ids).not.toContain(aocGrantCitation.id);
      expect(ids).not.toContain(noncomplianceGrantCitation.id);
      expect(ids).toContain(deficiencyGrantCitation.id);
    });

    it('filters out invalid types and returns all test GrantCitations', async () => {
      const ids = await findGrantCitationIds(withoutFindingType(['invalid-type', 'bogus']));
      expect(ids).toContain(aocGrantCitation.id);
      expect(ids).toContain(noncomplianceGrantCitation.id);
      expect(ids).toContain(deficiencyGrantCitation.id);
    });

    it('returns all test GrantCitations for an empty array', async () => {
      const ids = await findGrantCitationIds(withoutFindingType([]));
      expect(ids).toContain(aocGrantCitation.id);
      expect(ids).toContain(noncomplianceGrantCitation.id);
      expect(ids).toContain(deficiencyGrantCitation.id);
    });
  });
});
