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
    programIds: [],
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

  const insertProgram = async ({ grantId, programType }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "Programs"
        (id, "grantId", "programType", "createdAt", "updatedAt")
      VALUES
        (:id, :grantId, :programType, NOW(), NOW())
      RETURNING id`,
      {
        replacements: { id: getUniqueId(), grantId, programType },
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

  const insertActivityReport = async ({
    calculatedStatus,
    startDate,
    endDate,
    submissionStatus = 'submitted',
    regionId = 10,
    legacyId = null,
  }) => {
    const [row] = await db.sequelize.query(
      `INSERT INTO "ActivityReports"
        ("regionId", "legacyId", "calculatedStatus", "submissionStatus", "startDate", "endDate", "createdAt", "updatedAt")
      VALUES
        (:regionId, :legacyId, :calculatedStatus, :submissionStatus, :startDate, :endDate, NOW(), NOW())
      RETURNING id, "regionId", "legacyId"`,
      {
        replacements: {
          calculatedStatus,
          submissionStatus,
          startDate,
          endDate,
          regionId,
          legacyId,
        },
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
    await deleteByIds(
      'ActivityReportObjectiveCitations',
      createdIds.activityReportObjectiveCitationIds
    );
    await deleteByIds('ActivityReportObjectives', createdIds.activityReportObjectiveIds);
    await deleteByIds('ActivityReports', createdIds.activityReportIds);
    await deleteByIds('Objectives', createdIds.objectiveIds);
    await deleteByIds('DeliveredReviewCitations', createdIds.deliveredReviewCitationIds);
    await deleteByIds('GrantDeliveredReviews', createdIds.grantDeliveredReviewIds);
    await deleteByIds('GrantCitations', createdIds.grantCitationIds);
    await deleteByIds('DeliveredReviews', createdIds.deliveredReviewIds);
    await deleteByIds('Citations', createdIds.citationIds);
    await deleteByIds('Programs', createdIds.programIds);

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

    const programs = await Promise.all(
      ['HS', 'EHS'].map((programType) => insertProgram({ grantId: testGrant.id, programType }))
    );
    programs.forEach((program) => trackId('programIds', program.id));

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

    const secondInitialReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Second Initial Review',
      reportDeliveryDate: '2024-12-01',
      completeDate: '2024-12-03',
      corrected: false,
    });
    trackId('deliveredReviewIds', secondInitialReview.id);

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

    const secondCitation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(2)',
      initialReviewUuid: secondInitialReview.review_uuid,
      initialReportDeliveryDate: '2024-12-01',
    });
    trackId('citationIds', secondCitation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName,
    });
    trackId('grantCitationIds', grantCitation.id);

    const secondGrantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: secondCitation.id,
      recipientName,
    });
    trackId('grantCitationIds', secondGrantCitation.id);

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

    const secondDeliveredReviewCitation = await insertDeliveredReviewCitation({
      deliveredReviewId: compliantReview.id,
      citationId: secondCitation.id,
    });
    trackId('deliveredReviewCitationIds', secondDeliveredReviewCitation.id);

    const result = await compliantFollowUpReviewsDetails({
      deliveredReview: [{ id: compliantReview.id }],
      grantCitation: [{ id: [grantCitation.id, secondGrantCitation.id] }],
    });

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.rowId).sort()).toEqual(
      [
        `cfu-family-${initialReview.review_uuid}`,
        `cfu-family-${secondInitialReview.review_uuid}`,
      ].sort()
    );
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: `cfu-family-${initialReview.review_uuid}`,
          familyKey: initialReview.review_uuid,
          reviewId: compliantReview.mrid,
          reviewName: 'Compliant Follow-Up Review',
          recipientId: testGrant.recipientId,
          regionId: testGrant.regionId,
          recipientName,
          grantsOnReview: [`${grantNumber} - EHS, HS`],
          citationNumbers: ['1302.12(d)(1)'],
          hasTta: false,
          lastTtaDate: null,
          associatedActivityReports: [],
          compliantFollowUpReviewReceivedDate: '2025-01-25',
          initialReviews: [
            {
              reviewId: initialReview.mrid,
              reviewName: 'Initial Review',
              reviewReceivedDate: '2024-11-10',
            },
          ],
        }),
        expect.objectContaining({
          rowId: `cfu-family-${secondInitialReview.review_uuid}`,
          familyKey: secondInitialReview.review_uuid,
          reviewId: compliantReview.mrid,
          reviewName: 'Compliant Follow-Up Review',
          recipientId: testGrant.recipientId,
          regionId: testGrant.regionId,
          recipientName,
          grantsOnReview: [`${grantNumber} - EHS, HS`],
          citationNumbers: ['1302.12(d)(2)'],
          hasTta: false,
          lastTtaDate: null,
          associatedActivityReports: [],
          compliantFollowUpReviewReceivedDate: '2025-01-25',
          initialReviews: [
            {
              reviewId: secondInitialReview.mrid,
              reviewName: 'Second Initial Review',
              reviewReceivedDate: '2024-12-01',
            },
          ],
        }),
      ])
    );
  });

  it('sets hasTta=true and populates lastTtaDate and associatedActivityReports when an approved ActivityReport endDate is after the initial review and before the compliant review', async () => {
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
      reportDeliveryDate: '2025-03-31',
      completeDate: '2025-04-15',
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
      regionId: 14,
      legacyId: `LEGACY-AR-${getUniqueId()}`,
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
      reviewId: compliantReview.mrid,
      hasTta: true,
      lastTtaDate: '2025-03-20',
      associatedActivityReports: [
        {
          id: activityReport.id,
          displayId: activityReport.legacyId,
          legacyId: activityReport.legacyId,
          regionId: 14,
        },
      ],
    });
  });

  it('sets hasTta=false when the ActivityReport endDate is not before the compliant review received date', async () => {
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
      startDate: '2025-02-20',
      endDate: '2025-03-01',
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
      reviewId: compliantReview.mrid,
      hasTta: false,
      lastTtaDate: null,
      associatedActivityReports: [],
    });
  });

  it('sets hasTta=false when the only matching activity report has submissionStatus=deleted', async () => {
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
      reportDeliveryDate: '2025-03-31',
      completeDate: '2025-04-15',
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

    const deletedActivityReport = await insertActivityReport({
      calculatedStatus: 'approved',
      submissionStatus: 'deleted',
      startDate: '2025-03-15',
      endDate: '2025-03-20',
    });
    trackId('activityReportIds', deletedActivityReport.id);

    const objective = await insertObjective();
    trackId('objectiveIds', objective.id);

    const aro = await insertActivityReportObjective({
      activityReportId: deletedActivityReport.id,
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
      reviewId: compliantReview.mrid,
      hasTta: false,
      lastTtaDate: null,
      associatedActivityReports: [],
    });
  });

  it('sets hasTta=false when only out-of-scope grant activity report citations match', async () => {
    const recipientName = `Recipient ${getUniqueId()}`;
    const outOfScopeGrant = await createGrant({ regionId: 10 });

    try {
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
        reportDeliveryDate: '2025-03-31',
        completeDate: '2025-04-15',
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
        grantId: outOfScopeGrant.id,
        grantNumber: outOfScopeGrant.number,
      });
      trackId('activityReportObjectiveCitationIds', aroc.id);

      const result = await compliantFollowUpReviewsDetails({
        deliveredReview: [{ id: compliantReview.id }],
        grantCitation: [{ id: grantCitation.id }],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        reviewId: compliantReview.mrid,
        hasTta: false,
        lastTtaDate: null,
        associatedActivityReports: [],
      });
    } finally {
      await db.Grant.destroy({ where: { id: outOfScopeGrant.id }, individualHooks: true });
      await db.Recipient.destroy({ where: { id: outOfScopeGrant.recipientId } });
    }
  });

  it('returns one detail row for one initial-review family with multiple corrected follow-up rows', async () => {
    const grantNumber = testGrant.number;
    const recipientName = `Recipient ${getUniqueId()}`;

    const initialReview = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Review',
      reviewStatus: 'Complete',
      reviewName: 'Initial Family Review',
      reportDeliveryDate: '2025-01-15',
      completeDate: '2025-01-20',
      corrected: false,
    });
    trackId('deliveredReviewIds', initialReview.id);

    const olderFollowUp = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Older Corrected Follow-Up',
      reportDeliveryDate: '2025-06-10',
      completeDate: '2025-04-15',
      corrected: true,
    });
    trackId('deliveredReviewIds', olderFollowUp.id);

    const latestFollowUp = await insertDeliveredReview({
      mrid: getUniqueId(),
      reviewUuid: uuid(),
      reviewType: 'Follow-Up',
      reviewStatus: 'Complete',
      reviewName: 'Latest Corrected Follow-Up',
      reportDeliveryDate: '2025-05-10',
      completeDate: '2025-05-20',
      corrected: true,
    });
    trackId('deliveredReviewIds', latestFollowUp.id);

    const citation = await insertCitation({
      mfid: getUniqueId(),
      findingUuid: uuid(),
      citation: '1302.12(d)(1)',
      initialReviewUuid: initialReview.review_uuid,
      initialReportDeliveryDate: '2025-01-15',
    });
    trackId('citationIds', citation.id);

    const grantCitation = await insertGrantCitation({
      grantId: testGrant.id,
      citationId: citation.id,
      recipientName,
    });
    trackId('grantCitationIds', grantCitation.id);

    const grantDeliveredReviews = await Promise.all(
      [olderFollowUp, latestFollowUp].map((review) =>
        insertGrantDeliveredReview({
          grantId: testGrant.id,
          deliveredReviewId: review.id,
          recipientName,
        })
      )
    );
    grantDeliveredReviews.forEach((record) => trackId('grantDeliveredReviewIds', record.id));

    const deliveredReviewCitations = await Promise.all(
      [olderFollowUp, latestFollowUp].map((review) =>
        insertDeliveredReviewCitation({
          deliveredReviewId: review.id,
          citationId: citation.id,
        })
      )
    );
    deliveredReviewCitations.forEach((record) => trackId('deliveredReviewCitationIds', record.id));

    const activityReportAfterRepresentativeReceivedDate = await insertActivityReport({
      calculatedStatus: 'approved',
      startDate: '2025-05-15',
      endDate: '2025-05-15',
    });
    trackId('activityReportIds', activityReportAfterRepresentativeReceivedDate.id);

    const objective = await insertObjective();
    trackId('objectiveIds', objective.id);

    const aro = await insertActivityReportObjective({
      activityReportId: activityReportAfterRepresentativeReceivedDate.id,
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
      deliveredReview: [],
      grantCitation: [{ id: grantCitation.id }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      reviewId: latestFollowUp.mrid,
      reviewName: 'Latest Corrected Follow-Up',
      recipientName,
      grantsOnReview: [grantNumber],
      citationNumbers: ['1302.12(d)(1)'],
      hasTta: false,
      lastTtaDate: null,
      associatedActivityReports: [],
      compliantFollowUpReviewReceivedDate: '2025-05-10',
      initialReviews: [
        {
          reviewId: initialReview.mrid,
          reviewName: 'Initial Family Review',
          reviewReceivedDate: '2025-01-15',
        },
      ],
    });
  });

  it('does not combine recipient link fields when a family spans multiple recipients', async () => {
    const firstRecipientName = `A Recipient ${getUniqueId()}`;
    const secondRecipientName = `B Recipient ${getUniqueId()}`;
    const secondGrant = await createGrant({ regionId: 10 });
    let secondGrantCitation;
    let firstGrantDeliveredReview;
    let secondGrantDeliveredReview;

    try {
      const initialReview = await insertDeliveredReview({
        mrid: getUniqueId(),
        reviewUuid: uuid(),
        reviewType: 'Review',
        reviewStatus: 'Complete',
        reviewName: 'Initial Multi Recipient Review',
        reportDeliveryDate: '2025-01-15',
        completeDate: '2025-01-20',
        corrected: false,
      });
      trackId('deliveredReviewIds', initialReview.id);

      const compliantReview = await insertDeliveredReview({
        mrid: getUniqueId(),
        reviewUuid: uuid(),
        reviewType: 'Follow-Up',
        reviewStatus: 'Complete',
        reviewName: 'Compliant Multi Recipient Follow-Up',
        reportDeliveryDate: '2025-05-10',
        completeDate: '2025-05-20',
        corrected: true,
      });
      trackId('deliveredReviewIds', compliantReview.id);

      const citation = await insertCitation({
        mfid: getUniqueId(),
        findingUuid: uuid(),
        citation: '1302.12(d)(1)',
        initialReviewUuid: initialReview.review_uuid,
        initialReportDeliveryDate: '2025-01-15',
      });
      trackId('citationIds', citation.id);

      const firstGrantCitation = await insertGrantCitation({
        grantId: testGrant.id,
        citationId: citation.id,
        recipientName: firstRecipientName,
      });
      trackId('grantCitationIds', firstGrantCitation.id);

      secondGrantCitation = await insertGrantCitation({
        grantId: secondGrant.id,
        citationId: citation.id,
        recipientName: secondRecipientName,
      });
      trackId('grantCitationIds', secondGrantCitation.id);

      firstGrantDeliveredReview = await insertGrantDeliveredReview({
        grantId: testGrant.id,
        deliveredReviewId: compliantReview.id,
        recipientName: firstRecipientName,
      });
      trackId('grantDeliveredReviewIds', firstGrantDeliveredReview.id);

      secondGrantDeliveredReview = await insertGrantDeliveredReview({
        grantId: secondGrant.id,
        deliveredReviewId: compliantReview.id,
        recipientName: secondRecipientName,
      });
      trackId('grantDeliveredReviewIds', secondGrantDeliveredReview.id);

      const deliveredReviewCitation = await insertDeliveredReviewCitation({
        deliveredReviewId: compliantReview.id,
        citationId: citation.id,
      });
      trackId('deliveredReviewCitationIds', deliveredReviewCitation.id);

      const result = await compliantFollowUpReviewsDetails({
        deliveredReview: [{ id: compliantReview.id }],
        grantCitation: [{ id: [firstGrantCitation.id, secondGrantCitation.id] }],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        reviewId: compliantReview.mrid,
        recipientId: null,
        regionId: null,
        grantsOnReview: [testGrant.number, secondGrant.number].sort(),
      });
      expect(result[0].recipientName).toContain(firstRecipientName);
      expect(result[0].recipientName).toContain(secondRecipientName);
    } finally {
      if (secondGrantDeliveredReview?.id) {
        await deleteByIds('GrantDeliveredReviews', [secondGrantDeliveredReview.id]);
      }
      if (secondGrantCitation?.id) {
        await deleteByIds('GrantCitations', [secondGrantCitation.id]);
      }
      await db.Grant.destroy({ where: { id: secondGrant.id }, individualHooks: true });
      await db.Recipient.destroy({ where: { id: secondGrant.recipientId } });
    }
  });
});
