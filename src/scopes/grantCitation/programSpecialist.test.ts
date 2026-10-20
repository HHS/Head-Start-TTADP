import { v4 as uuid } from 'uuid';
import db from '../../models';
import { createGrant, createRecipient, getUniqueId } from '../../testUtils';
import { withoutProgramSpecialist, withProgramSpecialist } from './programSpecialist';

const { Citation, Grant, GrantCitation, Recipient } = db;

describe('grantCitation/programSpecialist', () => {
  let recipient;
  let patGrant;
  let jonGrant;
  let patCitation;
  let jonCitation;
  let patGrantCitation;
  let jonGrantCitation;

  const findGrantCitationIds = async (where) => {
    const grantCitations = await GrantCitation.findAll({
      where: {
        id: [patGrantCitation?.id, jonGrantCitation?.id].filter(Boolean),
        ...where,
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return grantCitations.map((grantCitation) => grantCitation.id);
  };

  beforeAll(async () => {
    recipient = await createRecipient({});

    patGrant = await createGrant({
      recipientId: recipient.id,
      regionId: 1,
      programSpecialistName: 'Pat Bowman',
    });

    jonGrant = await createGrant({
      recipientId: recipient.id,
      regionId: 1,
      programSpecialistName: 'Jon Jones',
    });

    const mfidSeed = getUniqueId();

    patCitation = await Citation.create({
      mfid: mfidSeed,
      finding_uuid: uuid(),
      citation: `1302.${mfidSeed}`,
    });

    jonCitation = await Citation.create({
      mfid: mfidSeed + 1,
      finding_uuid: uuid(),
      citation: `1302.${mfidSeed + 1}`,
    });

    patGrantCitation = await GrantCitation.create({
      grantId: patGrant.id,
      citationId: patCitation.id,
    });

    jonGrantCitation = await GrantCitation.create({
      grantId: jonGrant.id,
      citationId: jonCitation.id,
    });
  });

  afterAll(async () => {
    await GrantCitation.destroy({
      where: { id: [patGrantCitation?.id, jonGrantCitation?.id].filter(Boolean) },
      force: true,
    });
    await Citation.destroy({
      where: { id: [patCitation?.id, jonCitation?.id].filter(Boolean) },
      force: true,
    });
    await Grant.destroy({
      where: { id: [patGrant?.id, jonGrant?.id].filter(Boolean) },
      individualHooks: true,
    });
    await Recipient.destroy({ where: { id: recipient?.id }, force: true });
  });

  describe('withProgramSpecialist', () => {
    it('filters by partial match against associated grant program specialist name', async () => {
      const ids = await findGrantCitationIds(withProgramSpecialist(['pat']));

      expect(ids).toContain(patGrantCitation.id);
      expect(ids).not.toContain(jonGrantCitation.id);
    });

    it('returns no matches for empty or invalid search terms', async () => {
      const ids = await findGrantCitationIds(withProgramSpecialist(['   ']));

      expect(ids).toEqual([]);
    });
  });

  describe('withoutProgramSpecialist', () => {
    it('excludes partial matches against associated grant program specialist name', async () => {
      const ids = await findGrantCitationIds(withoutProgramSpecialist(['pat']));

      expect(ids).not.toContain(patGrantCitation.id);
      expect(ids).toContain(jonGrantCitation.id);
    });

    it('does not exclude any rows when terms are empty after sanitization', async () => {
      const ids = await findGrantCitationIds(withoutProgramSpecialist(['   ']));

      expect(ids).toContain(patGrantCitation.id);
      expect(ids).toContain(jonGrantCitation.id);
    });
  });
});
