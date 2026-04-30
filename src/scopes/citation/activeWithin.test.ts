import { v4 as uuid } from 'uuid';
import db from '../../models';
import { activeAfter, activeBefore, activeWithinDates } from './activeWithin';

const { Citation } = db;

describe('citation/activeWithin', () => {
  let janCitation;
  let febCitation;
  let marchCitation;
  let spanningCitation;
  let aprilCitation;

  const findCitationIds = async (query) => {
    const citations = await Citation.findAll({
      ...query,
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return citations.map((citation) => citation.id);
  };

  beforeAll(async () => {
    const mfidSeed = Math.floor(Math.random() * 1_000_000_000);

    janCitation = await Citation.create({
      mfid: mfidSeed,
      finding_uuid: uuid(),
      active: true,
      initial_report_delivery_date: '2025-01-31',
      active_through: '2025-01-31',
    });
    febCitation = await Citation.create({
      mfid: mfidSeed + 1,
      finding_uuid: uuid(),
      active: true,
      initial_report_delivery_date: '2025-02-28',
      active_through: '2025-02-28',
    });
    marchCitation = await Citation.create({
      mfid: mfidSeed + 2,
      finding_uuid: uuid(),
      active: true,
      initial_report_delivery_date: '2025-03-01',
      active_through: '2025-03-01',
    });
    spanningCitation = await Citation.create({
      mfid: mfidSeed + 3,
      finding_uuid: uuid(),
      active: true,
      initial_report_delivery_date: '2025-01-15',
      active_through: '2025-03-15',
    });
    aprilCitation = await Citation.create({
      mfid: mfidSeed + 4,
      finding_uuid: uuid(),
      active: true,
      initial_report_delivery_date: '2025-04-01',
      active_through: '2025-04-30',
    });
  });

  afterAll(async () => {
    await Citation.destroy({
      where: {
        id: [
          janCitation?.id,
          febCitation?.id,
          marchCitation?.id,
          spanningCitation?.id,
          aprilCitation?.id,
        ].filter(Boolean),
      },
      force: true,
    });
  });

  it('uses month-only inputs against persisted citation dates', async () => {
    await expect(findCitationIds({ where: activeBefore(['2025/02']) })).resolves.toEqual(
      [janCitation.id, febCitation.id, spanningCitation.id].sort()
    );

    await expect(findCitationIds({ where: activeAfter(['2025/02']) })).resolves.toEqual(
      [febCitation.id, marchCitation.id, spanningCitation.id, aprilCitation.id].sort()
    );

    await expect(
      findCitationIds({ where: activeWithinDates(['2025/02-2025/03']) })
    ).resolves.toEqual([febCitation.id, marchCitation.id, spanningCitation.id].sort());
  });

  it('uses normalized values for valid full-date inputs', async () => {
    await expect(findCitationIds({ where: activeBefore(['02/14/2025']) })).resolves.toEqual(
      [janCitation.id, spanningCitation.id].sort()
    );

    await expect(findCitationIds({ where: activeAfter(['2025-03-15']) })).resolves.toEqual(
      [spanningCitation.id, aprilCitation.id].sort()
    );

    await expect(
      findCitationIds({ where: activeWithinDates(['2025/02/14-2025/03/15']) })
    ).resolves.toEqual([febCitation.id, marchCitation.id, spanningCitation.id].sort());
  });

  it('ignores invalid or partial range inputs when querying citations', async () => {
    await expect(
      findCitationIds({
        where: activeWithinDates([
          '2025/02',
          '2025/02-',
          '-2025/03',
          'invalid-2025/03/15',
          '2025/02/14-invalid',
          '2025/02/14-2025/03/15',
        ]),
      })
    ).resolves.toEqual([febCitation.id, marchCitation.id, spanningCitation.id].sort());
  });
});
