import { Op } from 'sequelize';
import { v4 as uuid } from 'uuid';
import db from '../../models';
import { withStateCode } from './stateCode';

const { Citation, Grant, GrantCitation, Recipient } = db;

describe('grantCitation/stateCode', () => {
  let recipient;
  let azGrant;
  let nyGrant;
  let azCitation;
  let nyCitation;
  let azGrantCitation;
  let nyGrantCitation;

  const findGrantCitationIds = async (where) => {
    const grantCitations = await GrantCitation.findAll({
      where: {
        [Op.and]: [
          where,
          {
            id: [azGrantCitation?.id, nyGrantCitation?.id].filter(Boolean),
          },
        ],
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return grantCitations.map((grantCitation) => grantCitation.id);
  };

  beforeAll(async () => {
    const seed = Math.floor(Math.random() * 900_000) + 100_000;

    recipient = await Recipient.create({
      id: seed,
      name: `Test Recipient ${seed}`,
      uei: `UEI${seed}`.padEnd(12, '0').slice(0, 12),
    });

    azGrant = await Grant.create({
      id: seed,
      number: `TEST-GRANT-AZ-${seed}`,
      recipientId: recipient.id,
      regionId: 1,
      stateCode: 'AZ',
    });

    nyGrant = await Grant.create({
      id: seed + 1,
      number: `TEST-GRANT-NY-${seed}`,
      recipientId: recipient.id,
      regionId: 1,
      stateCode: 'NY',
    });

    const mfidSeed = Math.floor(Math.random() * 1_000_000_000);

    azCitation = await Citation.create({
      mfid: mfidSeed,
      finding_uuid: uuid(),
      citation: `1302.${mfidSeed}`,
    });

    nyCitation = await Citation.create({
      mfid: mfidSeed + 1,
      finding_uuid: uuid(),
      citation: `1302.${mfidSeed + 1}`,
    });

    azGrantCitation = await GrantCitation.create({
      grantId: azGrant.id,
      citationId: azCitation.id,
    });

    nyGrantCitation = await GrantCitation.create({
      grantId: nyGrant.id,
      citationId: nyCitation.id,
    });
  });

  afterAll(async () => {
    await GrantCitation.destroy({
      where: { id: [azGrantCitation?.id, nyGrantCitation?.id].filter(Boolean) },
      force: true,
    });

    await Citation.destroy({
      where: { id: [azCitation?.id, nyCitation?.id].filter(Boolean) },
      force: true,
    });

    await Grant.destroy({
      where: { id: [azGrant?.id, nyGrant?.id].filter(Boolean) },
      individualHooks: true,
    });

    await Recipient.destroy({ where: { id: recipient?.id }, force: true });
  });

  it('filters GrantCitations by associated Grant state code', async () => {
    const ids = await findGrantCitationIds(withStateCode(['AZ']));

    expect(ids).toContain(azGrantCitation.id);
    expect(ids).not.toContain(nyGrantCitation.id);
  });

  it('normalizes and sanitizes state codes before filtering', async () => {
    const ids = await findGrantCitationIds(withStateCode([' az ', 'ny', 'bad-input']));

    expect(ids).toContain(azGrantCitation.id);
    expect(ids).toContain(nyGrantCitation.id);
  });

  it('returns no matches when no valid state codes are provided', async () => {
    const ids = await findGrantCitationIds(withStateCode(['invalid']));

    expect(ids).toHaveLength(0);
  });
});
