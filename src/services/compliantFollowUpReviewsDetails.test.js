import { QueryTypes } from 'sequelize';
import { v4 as uuid } from 'uuid';
import db from '../models';
import { createGrant, getUniqueId } from '../testUtils';
import compliantFollowUpReviewsDetails from './compliantFollowUpReviewsDetails';

describe('compliantFollowUpReviewsDetails', () => {
  let testGrant;

  const createdIds = {
    activityReportObjectiveCitationIds: [],
    activityReportObjectiveIds: [],
    activityReportIds: [],
    objectiveIds: [],
    deliveredReviewCitationIds: [],
    grantDeliveredReviewIds: [],
    grantCitationIds: [],
    deliveredReviewIds: [],
    citationIds: [],
  };

  const trackId = (bucket, id) => {
    if (id) {
      createdIds[bucket].push(id);
    }
  };

  beforeAll(async () => {
    testGrant = await createGrant({});
  });

  const insertDeliveredReview = async ({
    mrid,
    reviewUuid,
    reviewType,
    reviewStatus,
    reviewName,
    reportDeliveryDate,
    completeDate,
    corrected,
  }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "DeliveredReviews"
        (mrid, review_uuid, review_type, review_status, review_name, report_delivery_date, complete_date, corrected, "createdAt", "updatedAt")
      VALUES
        (:mrid, :reviewUuid, :reviewType, :reviewStatus, :reviewName, :reportDeliveryDate, :completeDate, :corrected, NOW(), NOW())
      RETURNING id, mrid, review_uuid`,
      {
        replacements: {
          mrid,
          reviewUuid,
          reviewType,
          reviewStatus,
          reviewName,
          reportDeliveryDate,
          completeDate,
          corrected,
        },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertCitation = async ({
    mfid,
    findingUuid,
    citation,
    initialReviewUuid = null,
    initialReportDeliveryDate = null,
  }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "Citations"
        (mfid, finding_uuid, citation, initial_review_uuid, initial_report_delivery_date, "createdAt", "updatedAt")
      VALUES
        (:mfid, :findingUuid, :citation, :initialReviewUuid, :initialReportDeliveryDate, NOW(), NOW())
      RETURNING id`,
      {
        replacements: {
          mfid,
          findingUuid,
          citation,
          initialReviewUuid,
          initialReportDeliveryDate,
        },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertGrantCitation = async ({ grantId, citationId, recipientName = null }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "GrantCitations"
        ("grantId", "citationId", recipient_id, recipient_name, region_id, "createdAt", "updatedAt")
      VALUES
        (:grantId, :citationId, NULL, :recipientName, NULL, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { grantId, citationId, recipientName },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertGrantDeliveredReview = async ({
    grantId,
    deliveredReviewId,
    recipientName = null,
  }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "GrantDeliveredReviews"
        ("grantId", "deliveredReviewId", recipient_id, recipient_name, region_id, "createdAt", "updatedAt")
      VALUES
        (:grantId, :deliveredReviewId, NULL, :recipientName, NULL, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { grantId, deliveredReviewId, recipientName },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertDeliveredReviewCitation = async ({ deliveredReviewId, citationId }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "DeliveredReviewCitations"
        ("deliveredReviewId", "citationId", "createdAt", "updatedAt")
      VALUES
        (:deliveredReviewId, :citationId, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { deliveredReviewId, citationId },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertActivityReport = async ({ calculatedStatus, startDate, endDate }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "ActivityReports"
        ("regionId", "calculatedStatus", "startDate", "endDate", "createdAt", "updatedAt")
      VALUES
        (10, :calculatedStatus, :startDate, :endDate, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { calculatedStatus, startDate, endDate },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertObjective = async () => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "Objectives"
        (title, status, "onAR", "onApprovedAR", "createdAt", "updatedAt")
      VALUES
        ('Test Objective', 'In Progress', false, false, NOW(), NOW())
      RETURNING id`,
      { type: QueryTypes.SELECT }
    );

    return row;
  };

  const insertActivityReportObjective = async ({ activityReportId, objectiveId }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "ActivityReportObjectives"
        ("activityReportId", "objectiveId", "createdAt", "updatedAt")
      VALUES
        (:activityReportId, :objectiveId, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { activityReportId, objectiveId },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const insertActivityReportObjectiveCitation = async ({
    activityReportObjectiveId,
    citationId,
    grantId,
    grantNumber,
  }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "ActivityReportObjectiveCitations"
        ("activityReportObjectiveId", "citationId", citation, "grantNumber", "findingId",
         "grantId", "reviewName", "standardId", "findingType", acro, name, severity,
         "reportDeliveryDate", "monitoringFindingStatusName", "createdAt", "updatedAt")
      VALUES
        (:activityReportObjectiveId, :citationId, '1302.12(d)(1)', :grantNumber,
         'test-finding-id', :grantId, 'Test Review', 1, 'Noncompliance', 'AOC',
         '1302.12(d)(1)', 1, '2024-11-10', 'Complete', NOW(), NOW())
      RETURNING id`,
      {
        replacements: { activityReportObjectiveId, citationId, grantId, grantNumber },
        type: QueryTypes.SELECT,
      }
    );

    return row;
  };

  const deleteByIds = async (tableName, ids, idColumn = 'id') => {
    if (!ids.length) {
      return;
    }

    await db.sequelize.query(`DELETE FROM "${tableName}" WHERE "${idColumn}" IN (:ids)`, {
      replacements: { ids },
      type: QueryTypes.DELETE,
    });
  };

  afterEach(async () => {
    await deleteByIds('ActivityReportObjectiveCitations', createdIds.activityReportObjectiveCitationIds);
    await deleteByIds('ActivityReportObjectives', createdIds.activityReportObjectiveIds);
    await deleteByIds('ActivityReports', createdIds.activityReportIds);
    await deleteByIds('Objectives', createdIds.objectiveIds);
    await deleteByIds('DeliveredReviewCitations', createdIds.deliveredReviewCitationIds);
    await deleteByIds('GrantDeliveredReviews', createdIds.grantDeliveredReviewIds);
    await deleteByIds('GrantCitations', createdIds.grantCitationIds);
    await deleteByIds('DeliveredReviews', createdIds.deliveredReviewIds);
    await deleteByIds('Citations', createdIds.citationIds);

    Object.keys(createdIds).forEach((key) => {
      createdIds[key] = [];
    });

    jest.restoreAllMocks();
  });

  afterAll(async () => {
    const { Grant, Recipient } = db;
    await Grant.destroy({ where: { id: testGrant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: testGrant.recipientId } });
    await db.sequelize.close();
  });

  it('returns an empty array when no scoped grant citations exist', async () => {
    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [],
      grantCitation: [{ id: -1 }],
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array when no compliant delivered reviews exist', async () => {
    const citation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(1)',
      initialReportDeliveryDate: '2025-01-15',
    });
    trackId('citationIds', citation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName: null,
    });
    trackId('grantCitationIds', grantCitation.id);

    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [{ review_type: 'Follow-Up' }],
      grantCitation: [{ id: grantCitation.id }],
    });

    expect(result).toEqual([]);
  });

  it('returns details mapped to the expected response shape', async () => {
    const grantNumber = testGrant.number;
    const recipientName = `Recipient ${getUniqueId()}`;

    const initialReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Initial Review',
      reportDeliveryDate: '2024-11-10',
      completeDate: '2024-11-12',
      corrected: false,
    });
    trackId('deliveredReviewIds', initialReview.id);

    const compliantReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Compliant Follow-Up Review',
      reportDeliveryDate: '2025-01-25',
      completeDate: '2025-02-15',
      corrected: true,
    });
    trackId('deliveredReviewIds', compliantReview.id);

    const citation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(1)',
      initialReviewUuid: initialReview.review_uuid,
      initialReportDeliveryDate: '2024-11-10',
    });
    trackId('citationIds', citation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName,
    });
    trackId('grantCitationIds', grantCitation.id);

    const grantDeliveredReview = await insertGrantDeliveredReview({
      grantId: testGrant.id,
      deliveredReviewId: compliantReview.id,
      recipientName,
    });
    trackId('grantDeliveredReviewIds', grantDeliveredReview.id);

    const deliveredReviewCitation = await insertDeliveredReviewCitation({
      deliveredReviewId: compliantReview.id,
      citationId: citation.id,
    });
    trackId('deliveredReviewCitationIds', deliveredReviewCitation.id);

    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [{ id: compliantReview.id }],
      grantCitation: [{ id: grantCitation.id }],
    });

    expect(result).toEqual([
      {
        id: compliantReview.id,
        recipientName,
        grantsOnReview: [grantNumber],
        citationNumbers: ['1302.12(d)(1)'],
        hasTta: false,
        lastTtaDate: null,
        associatedActivityReports: [],
        compliantFollowUpReviewReceivedDate: '2025-01-25',
        initialReviewReceivedDate: '2024-11-10',
        initialReviewId: initialReview.mrid,
      },
    ]);
  });

  it('sets hasTta=true and populates lastTtaDate and associatedActivityReports when an approved ActivityReport startDate falls within the review window', async () => {
    const grantNumber = testGrant.number;
    const recipientName = `Recipient ${getUniqueId()}`;

    const initialReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Initial Review',
      reportDeliveryDate: '2024-11-10',
      completeDate: '2024-11-12',
      corrected: false,
    });
    trackId('deliveredReviewIds', initialReview.id);

    const compliantReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Compliant Follow-Up Review',
      reportDeliveryDate: '2025-03-01',
      completeDate: '2025-03-31',
      corrected: true,
    });
    trackId('deliveredReviewIds', compliantReview.id);

    const citation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(1)',
      initialReviewUuid: initialReview.review_uuid,
      initialReportDeliveryDate: '2024-11-10',
    });
    trackId('citationIds', citation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName,
    });
    trackId('grantCitationIds', grantCitation.id);

    const grantDeliveredReview = await insertGrantDeliveredReview({
      grantId: testGrant.id,
      deliveredReviewId: compliantReview.id,
      recipientName,
    });
    trackId('grantDeliveredReviewIds', grantDeliveredReview.id);

    const deliveredReviewCitation = await insertDeliveredReviewCitation({
      deliveredReviewId: compliantReview.id,
      citationId: citation.id,
    });
    trackId('deliveredReviewCitationIds', deliveredReviewCitation.id);

    const activityReport = await insertActivityReport({
      calculatedStatus: 'approved',
      startDate: '2025-03-15',
      endDate: '2025-03-20',
    });
    trackId('activityReportIds', activityReport.id);

    const objective = await insertObjective();
    trackId('objectiveIds', objective.id);

    const aro = await insertActivityReportObjective({
      activityReportId: activityReport.id,
      objectiveId: objective.id,
    });
    trackId('activityReportObjectiveIds', aro.id);

    const aroc = await insertActivityReportObjectiveCitation({
      activityReportObjectiveId: aro.id,
      citationId: citation.id,
      grantId: testGrant.id,
      grantNumber,
    });
    trackId('activityReportObjectiveCitationIds', aroc.id);

    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [{ id: compliantReview.id }],
      grantCitation: [{ id: grantCitation.id }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: compliantReview.id,
      hasTta: true,
      lastTtaDate: '2025-03-20',
      associatedActivityReports: [activityReport.id],
    });
  });

  it('sets hasTta=false when the ActivityReport startDate falls outside the review window (boundary behavior)', async () => {
    const recipientName = `Recipient ${getUniqueId()}`;

    const initialReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Initial Review',
      reportDeliveryDate: '2024-11-10',
      completeDate: '2024-11-12',
      corrected: false,
    });
    trackId('deliveredReviewIds', initialReview.id);

    const compliantReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Compliant Follow-Up Review',
      reportDeliveryDate: '2025-03-01',
      completeDate: '2025-03-31',
      corrected: true,
    });
    trackId('deliveredReviewIds', compliantReview.id);

    const citation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(1)',
      initialReviewUuid: initialReview.review_uuid,
      initialReportDeliveryDate: '2024-11-10',
    });
    trackId('citationIds', citation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName,
    });
    trackId('grantCitationIds', grantCitation.id);

    const grantDeliveredReview = await insertGrantDeliveredReview({
      grantId: testGrant.id,
      deliveredReviewId: compliantReview.id,
      recipientName,
    });
    trackId('grantDeliveredReviewIds', grantDeliveredReview.id);

    const deliveredReviewCitation = await insertDeliveredReviewCitation({
      deliveredReviewId: compliantReview.id,
      citationId: citation.id,
    });
    trackId('deliveredReviewCitationIds', deliveredReviewCitation.id);

    // startDate is one day after complete_date — just outside the window boundary
    const activityReport = await insertActivityReport({
      calculatedStatus: 'approved',
      startDate: '2025-04-01',
      endDate: '2025-04-05',
    });
    trackId('activityReportIds', activityReport.id);

    const objective = await insertObjective();
    trackId('objectiveIds', objective.id);

    const aro = await insertActivityReportObjective({
      activityReportId: activityReport.id,
      objectiveId: objective.id,
    });
    trackId('activityReportObjectiveIds', aro.id);

    const aroc = await insertActivityReportObjectiveCitation({
      activityReportObjectiveId: aro.id,
      citationId: citation.id,
      grantId: testGrant.id,
      grantNumber: testGrant.number,
    });
    trackId('activityReportObjectiveCitationIds', aroc.id);

    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [{ id: compliantReview.id }],
      grantCitation: [{ id: grantCitation.id }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: compliantReview.id,
      hasTta: false,
      lastTtaDate: null,
      associatedActivityReports: [],
    });
  });
});
