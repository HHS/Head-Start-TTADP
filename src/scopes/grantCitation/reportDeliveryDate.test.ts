import { Op, QueryTypes } from 'sequelize';
import { v4 as uuid } from 'uuid';
import db from '../../models';
import { createGrant, getUniqueId } from '../../testUtils';
import {
  afterReportDeliveryDate,
  beforeReportDeliveryDate,
  withinReportDeliveryDates,
} from './reportDeliveryDate';

const { DeliveredReview, GrantCitation } = db;

describe('grantCitation/reportDeliveryDate', () => {
  let grant;
  let otherGrant;
  let januaryGrantCitation;
  let februaryGrantCitation;
  let marchGrantCitation;
  let otherGrantCitation;
  const createdIds = {
    deliveredReviewCitationIds: [],
    grantDeliveredReviewIds: [],
    deliveredReviewIds: [],
    citationIds: [],
  };

  const trackId = (bucket, id) => {
    if (id) {
      createdIds[bucket].push(id);
    }
  };

  const insertCitation = async (mfid) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "Citations"
        (mfid, finding_uuid, citation, "createdAt", "updatedAt")
      VALUES
        (:mfid, :findingUuid, :citation, NOW(), NOW())
      RETURNING id`,
      {
        replacements: {
          mfid,
          findingUuid: uuid(),
          citation: `1302.${mfid}`,
        },
        type: QueryTypes.SELECT,
      }
    );
    trackId('citationIds', row.id);
    return row;
  };

  const insertDeliveredReview = async (reportDeliveryDate) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "DeliveredReviews"
        (mrid, review_uuid, report_delivery_date, "createdAt", "updatedAt")
      VALUES
        (:mrid, :reviewUuid, :reportDeliveryDate, NOW(), NOW())
      RETURNING id`,
      {
        replacements: {
          mrid: getUniqueId(),
          reviewUuid: uuid(),
          reportDeliveryDate,
        },
        type: QueryTypes.SELECT,
      }
    );
    trackId('deliveredReviewIds', row.id);
    return row;
  };

  const insertGrantDeliveredReview = async ({ grantId, deliveredReviewId }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "GrantDeliveredReviews"
        ("grantId", "deliveredReviewId", "createdAt", "updatedAt")
      VALUES
        (:grantId, :deliveredReviewId, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { grantId, deliveredReviewId },
        type: QueryTypes.SELECT,
      }
    );
    trackId('grantDeliveredReviewIds', row.id);
    return row;
  };

  const insertDeliveredReviewCitation = async ({ citationId, deliveredReviewId }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "DeliveredReviewCitations"
        ("citationId", "deliveredReviewId", "createdAt", "updatedAt")
      VALUES
        (:citationId, :deliveredReviewId, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { citationId, deliveredReviewId },
        type: QueryTypes.SELECT,
      }
    );
    trackId('deliveredReviewCitationIds', row.id);
    return row;
  };

  const findGrantCitationIds = async (where, extraFixtureIds = []) => {
    const fixtureIds = [
      januaryGrantCitation.id,
      februaryGrantCitation.id,
      marchGrantCitation.id,
      otherGrantCitation.id,
      ...extraFixtureIds,
    ];
    const grantCitations = await GrantCitation.findAll({
      where: {
        [Op.and]: [where, { id: { [Op.in]: fixtureIds } }],
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    return grantCitations.map((record) => record.id);
  };

  beforeAll(async () => {
    grant = await createGrant({});
    otherGrant = await createGrant({});

    const januaryCitation = await insertCitation(getUniqueId());
    const februaryCitation = await insertCitation(getUniqueId());
    const marchCitation = await insertCitation(getUniqueId());
    const otherGrantCitationRecord = await insertCitation(getUniqueId());

    januaryGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: januaryCitation.id,
    });
    februaryGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: februaryCitation.id,
    });
    marchGrantCitation = await GrantCitation.create({
      grantId: grant.id,
      citationId: marchCitation.id,
    });
    otherGrantCitation = await GrantCitation.create({
      grantId: otherGrant.id,
      citationId: otherGrantCitationRecord.id,
    });

    const januaryReview = await insertDeliveredReview('2025-01-31');
    const februaryReview = await insertDeliveredReview('2025-02-15');
    const marchReview = await insertDeliveredReview('2025-03-01');
    const otherGrantReview = await insertDeliveredReview('2025-02-15');

    await insertGrantDeliveredReview({ grantId: grant.id, deliveredReviewId: januaryReview.id });
    await insertGrantDeliveredReview({ grantId: grant.id, deliveredReviewId: februaryReview.id });
    await insertGrantDeliveredReview({ grantId: grant.id, deliveredReviewId: marchReview.id });
    await insertGrantDeliveredReview({
      grantId: otherGrant.id,
      deliveredReviewId: otherGrantReview.id,
    });

    await insertDeliveredReviewCitation({
      citationId: januaryCitation.id,
      deliveredReviewId: januaryReview.id,
    });
    await insertDeliveredReviewCitation({
      citationId: februaryCitation.id,
      deliveredReviewId: februaryReview.id,
    });
    await insertDeliveredReviewCitation({
      citationId: marchCitation.id,
      deliveredReviewId: marchReview.id,
    });
    await insertDeliveredReviewCitation({
      citationId: otherGrantCitationRecord.id,
      deliveredReviewId: otherGrantReview.id,
    });
  });

  afterAll(async () => {
    await db.DeliveredReviewCitation.destroy({
      where: { id: createdIds.deliveredReviewCitationIds },
      force: true,
    });
    await db.GrantDeliveredReview.destroy({
      where: { id: createdIds.grantDeliveredReviewIds },
      force: true,
    });
    await DeliveredReview.destroy({ where: { id: createdIds.deliveredReviewIds }, force: true });
    await GrantCitation.destroy({
      where: {
        id: [
          januaryGrantCitation?.id,
          februaryGrantCitation?.id,
          marchGrantCitation?.id,
          otherGrantCitation?.id,
        ].filter(Boolean),
      },
      force: true,
    });
    await db.Citation.destroy({ where: { id: createdIds.citationIds }, force: true });
    await db.GrantNumberLink.destroy({
      where: { grantId: [grant?.id, otherGrant?.id].filter(Boolean) },
      force: true,
    });
    await db.Grant.destroy({ where: { id: [grant?.id, otherGrant?.id].filter(Boolean) } });
    await db.Recipient.destroy({
      where: { id: [grant?.recipientId, otherGrant?.recipientId].filter(Boolean) },
    });
    await db.sequelize.close();
  });

  it('filters grant citations by linked delivered review report delivery date range', async () => {
    await expect(
      findGrantCitationIds(withinReportDeliveryDates(['2025/02/01-2025/02/28']))
    ).resolves.toEqual([februaryGrantCitation.id, otherGrantCitation.id]);
  });

  it('filters grant citations by linked delivered review report delivery date floor', async () => {
    await expect(findGrantCitationIds(afterReportDeliveryDate(['2025/02/15']))).resolves.toEqual([
      februaryGrantCitation.id,
      marchGrantCitation.id,
      otherGrantCitation.id,
    ]);
  });

  it('filters grant citations by linked delivered review report delivery date ceiling', async () => {
    await expect(findGrantCitationIds(beforeReportDeliveryDate(['2025/01']))).resolves.toEqual([
      januaryGrantCitation.id,
    ]);
  });

  it('does not match a grant citation through a review delivered for a different grant', async () => {
    const crossGrantCitation = await insertCitation(getUniqueId());
    const crossGrantGrantCitation = await GrantCitation.create({
      grantId: otherGrant.id,
      citationId: crossGrantCitation.id,
    });
    const crossGrantReview = await insertDeliveredReview('2025-02-20');

    await insertGrantDeliveredReview({
      grantId: grant.id,
      deliveredReviewId: crossGrantReview.id,
    });
    await insertDeliveredReviewCitation({
      citationId: crossGrantCitation.id,
      deliveredReviewId: crossGrantReview.id,
    });

    try {
      await expect(
        findGrantCitationIds(withinReportDeliveryDates(['2025/02/01-2025/02/28']), [
          crossGrantGrantCitation.id,
        ])
      ).resolves.not.toContain(crossGrantGrantCitation.id);
    } finally {
      await GrantCitation.destroy({ where: { id: crossGrantGrantCitation.id }, force: true });
    }
  });
});
