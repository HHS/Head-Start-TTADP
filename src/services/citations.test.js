/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */

import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';
import db, {
  Goal,
  GoalTemplate,
  Grant,
  GrantRelationshipToActive,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingHistory,
  MonitoringFindingStandard,
  MonitoringFindingStatus,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringStandard,
  Recipient,
} from '../models';
import updateMonitoringFactTables from '../tools/updateMonitoringFactTables';
import { getCitationsByGrantIds, textByCitation } from './citations';

// create a function to create a citation for a grant.
const createMonitoringData = async (
  grantNUmber, // Grant Number.
  reviewStatusId, // Status ID.
  reportDeliveryDate, // Report Delivery Date must be between start cutoff and todays date.
  reviewType, // Review Type must be in ('AIAN-DEF', 'RAN', 'Follow-up', 'FA-1', 'FA1-FR', 'FA-2', 'FA2-CR', 'Special')
  monitoringReviewStatusName, // Monitoring Review Status Name must be 'Complete'.
  citationsArray, // Array of citations to create.
  granteeId = uuidv4(),
  reviewName = faker.random.words(3)
) => {
  const reviewId = uuidv4();

  // MonitoringReviewGrantee.
  await MonitoringReviewGrantee.create(
    {
      id: faker.datatype.number({ min: 9999 }),
      grantNumber: grantNUmber,
      reviewId,
      granteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Support Team',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    },
    { individualHooks: true }
  );

  // MonitoringReview.
  await MonitoringReview.create(
    {
      reviewId,
      contentId: faker.datatype.uuid(),
      statusId: reviewStatusId,
      name: reviewName,
      startDate: new Date(),
      endDate: new Date(),
      reviewType,
      reportDeliveryDate,
      reportAttachmentId: faker.datatype.uuid(),
      outcome: faker.random.words(5),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    },
    { individualHooks: true }
  );

  // MonitoringReviewStatus.
  await MonitoringReviewStatus.create(
    {
      statusId: reviewStatusId,
      name: monitoringReviewStatusName,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    },
    { individualHooks: true }
  );

  // MonitoringFindingHistory (this is the primary finding table and the relationship to citation is 1<>1).
  // If we wanted one grant to have multiple citations, we would need to create multiple findings here and below.
  await Promise.all(
    citationsArray.map(async (citation) => {
      const sourceDeletedAt = citation.sourceDeletedAt || null;
      const findingId = citation.findingId || uuidv4();
      const findingStatusId = faker.datatype.number({ min: 9999 });
      await MonitoringFindingHistory.create(
        {
          reviewId,
          findingHistoryId: uuidv4(),
          findingId,
          statusId: findingStatusId,
          narrative: faker.random.words(10),
          ordinal: faker.datatype.number({ min: 1, max: 10 }),
          determination: citation.determination || null,
          hash: faker.datatype.uuid(),
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
          sourceDeletedAt,
        },
        { individualHooks: true }
      );

      // MonitoringFinding.
      await MonitoringFinding.create(
        {
          findingId,
          statusId: findingStatusId,
          findingType: citation.monitoringFindingType,
          hash: faker.datatype.uuid(),
          source: 'Internal Controls',
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
          sourceDeletedAt,
        },
        { individualHooks: true }
      );

      // MonitoringFindingStatus.
      await MonitoringFindingStatus.create(
        {
          statusId: findingStatusId,
          name: citation.monitoringFindingStatusName,
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
        },
        { individualHooks: true }
      );

      // MonitoringFindingGrant.
      await MonitoringFindingGrant.create(
        {
          findingId,
          granteeId,
          statusId: findingStatusId,
          findingType: citation.monitoringFindingGrantFindingType,
          source: 'Discipline',
          correctionDeadLine: new Date(),
          reportedDate: new Date(),
          closedDate: null,
          hash: faker.datatype.uuid(),
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
          sourceDeletedAt: null,
        },
        { individualHooks: true }
      );

      // MonitoringFindingStandard (this table joins a finding to a standard (citation)).
      const standardId = citation.standardId ?? faker.datatype.number({ min: 9999 });
      const citable = faker.datatype.number({ min: 1, max: 10 });
      await MonitoringFindingStandard.create(
        {
          findingId,
          standardId, // Integer
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
        },
        { individualHooks: true }
      );

      // MonitoringStandard. Use findOrCreate when standardId is explicitly provided so
      // multiple findings can share the same standard without a PK conflict.
      await MonitoringStandard.findOrCreate({
        where: { standardId },
        defaults: {
          standardId,
          citation: citation.citationText,
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
          contentId: uuidv4(),
          hash: uuidv4(),
          text: citation.standardText ?? faker.random.words(10),
          citable,
        },
        individualHooks: true,
      });
    })
  );
};

describe('citations service', () => {
  let snapShot;

  let recipient1;
  let recipient2;
  let followUpRecipient;

  let grant1; // Recipient 1
  let grant1a; // Recipient 1
  let grant2; // Recipient 2
  let grant3; // Recipient 2 (Inactive)
  let followUpGrant;
  let multiReviewRecipient;
  let multiReviewGrant;
  let suppressedRecipient;
  let suppressedGrant;
  let crossGrant;
  let crossGrantOtherGrant;

  beforeAll(async () => {
    // Capture a snapshot of the database before running the test.
    snapShot = await captureSnapshot();

    // Get Monitoring Goal Template.
    const monitoringGoalTemplate = await GoalTemplate.findOne({
      where: {
        standard: 'Monitoring',
      },
    });

    // Grant Numbers.
    const grantNumber1 = faker.datatype.string(8);
    const grantNumber1a = faker.datatype.string(8);
    const grantNumber2 = faker.datatype.string(8);
    const grantNumber3 = faker.datatype.string(8);
    const followUpGrantNumber = faker.datatype.string(8);
    const multiReviewGrantNumber = faker.datatype.string(8);
    const suppressedGrantNumber = faker.datatype.string(8);

    // Recipients 1.
    recipient1 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    // Recipients 2.
    recipient2 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    // FollowUpRecipient.
    followUpRecipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    multiReviewRecipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    suppressedRecipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    // Grants.
    const grants = await Grant.bulkCreate([
      {
        // Grant 1 for Recipient 1.
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber1,
        recipientId: recipient1.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // Grant 1a for Recipient 1.
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber1a,
        recipientId: recipient1.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // Grant 2 for Recipient 2.
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber2,
        recipientId: recipient2.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // Grant 3 for Recipient 2 (Inactive).
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber3,
        recipientId: recipient2.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Inactive',
      },
      // FollowUp Grant for FollowUp Recipient.
      {
        id: faker.datatype.number({ min: 9999 }),
        number: followUpGrantNumber,
        recipientId: followUpRecipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      // Multi-review grant: tests that the correct review is selected based on reportStartDate.
      {
        id: faker.datatype.number({ min: 9999 }),
        number: multiReviewGrantNumber,
        recipientId: multiReviewRecipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      // Suppressed grant: tests that citations are hidden when last_closed_goal > latest delivery.
      {
        id: faker.datatype.number({ min: 9999 }),
        number: suppressedGrantNumber,
        recipientId: suppressedRecipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
    ]);

    // set the grants.
    grant1 = grants[0];
    grant1a = grants[1];
    grant2 = grants[2];
    grant3 = grants[3];
    followUpGrant = grants[4];
    multiReviewGrant = grants[5];
    suppressedGrant = grants[6];

    // Create Goals and Link them to Grants.
    await Goal.create({
      name: 'Monitoring Goal 1',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant1.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    // closed Monitoring Goal.
    await Goal.create({
      name: 'Monitoring Goal 2',
      status: 'Closed',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant1.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    // Regular Goal.
    await Goal.create({
      name: 'Regular Goal 1',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant1.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'activityReport',
    });

    // Create monitoring goal for grant 2.
    await Goal.create({
      name: 'Monitoring Goal 3',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant1a.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    // Goal for FollowUpGrant (Corrected Finding test)
    await Goal.create({
      name: 'CorrectedFinding Goal',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: followUpGrant.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    // Goal for multiReviewGrant (multi-review test)
    await Goal.create({
      name: 'MultiReview Goal',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: multiReviewGrant.id,
      createdAt: '2025-02-01T00:00:00.000Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    // Goals for suppressedGrant: one historical closed goal (seeds last_closed_goal in
    // citations_live_values) and one open goal (keeps the grant eligible for the Goals JOIN).
    // The closed goal's GoalStatusChange.performedAt defaults to now, which is after the
    // historical review delivery date (2025-02-01), triggering suppression.
    await Goal.create({
      name: 'Suppressed Grant Closed Goal',
      status: 'Closed',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: suppressedGrant.id,
      createdAt: '2025-02-15T00:00:00.000Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });
    await Goal.create({
      name: 'Suppressed Grant Open Goal',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: suppressedGrant.id,
      createdAt: '2025-02-15T00:00:00.000Z',
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    /*
        Citation Object Properties:
          citationText, // Citation Text
          monitoringFindingType, // Monitoring Finding ('Deficiency', 'Significant Deficiency', 'Material Weakness', 'No Finding').
          monitoringFindingStatusName, // Monitoring Finding Status name must be 'Active'.
          monitoringFindingGrantFindingType, // Monitoring Finding Grant Finding Type must be in ('Corrective Action', 'Management Decision', 'No Finding').
    */

    // Create Monitoring Review Citations.
    const grant1Citations1 = [
      {
        citationText: 'Grant 1 - Citation 1 - Good',
        monitoringFindingType: 'Citation 1 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
      {
        citationText: 'Grant 1 - Citation 2 - Bad MFS name',
        monitoringFindingType: 'Citation 2 Monitoring Finding Type',
        monitoringFindingStatusName: 'Abandoned',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
      {
        citationText: 'Grant 1 - Citation 3 - Good 2',
        monitoringFindingType: 'Citation 3 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
      {
        citationText: 'Grant 1 - Citation 4 - Deleted',
        monitoringFindingType: 'Citation 4 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
        // This should make this citation not show up in counts
        sourceDeletedAt: new Date(),
      },
    ];

    // Grant 1.
    await createMonitoringData(
      grant1.number,
      1,
      new Date(),
      'AIAN-DEF',
      'Complete',
      grant1Citations1
    );

    // Grant 1a (make sure other grant citations comeback).
    const grant1Citations1a = [
      {
        citationText: 'Grant 1a - Citation 1 - Good',
        monitoringFindingType: 'Citation 4 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Grant 1a Corrective Action',
      },
    ];
    await createMonitoringData(
      grant1a.number,
      2,
      new Date(),
      'AIAN-DEF',
      'Complete',
      grant1Citations1a
    );

    // Grant 2. standardId is fixed to avoid faker collisions with seed data — both reviews
    // share the same standardId so textByCitation returns exactly one row per (citation, standard_text).
    const grant2StandardId = 2000000001;
    const grant1Citations2 = [
      {
        standardId: grant2StandardId,
        citationText: 'Grant 2 - Citation 1 - Good',
        monitoringFindingType: 'citation 5 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];
    // Before delivery date.
    await createMonitoringData(
      grant2.number,
      3,
      new Date('2024-09-01'),
      'AIAN-DEF',
      'Complete',
      grant1Citations2
    );
    // After delivery date (tomorrow).
    await createMonitoringData(
      grant2.number,
      4,
      new Date(new Date().setDate(new Date().getDate() + 1)),
      'AIAN-DEF',
      'Complete',
      grant1Citations2
    );

    // Grant 3 (inactive).
    const grant1Citations3 = [
      {
        citationText: 'Grant 3 - Citation 1 - Good',
        monitoringFindingType: 'Material Weakness',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];
    await createMonitoringData(
      grant3.number,
      5,
      new Date(),
      'AIAN-DEF',
      'Complete',
      grant1Citations3
    );

    // Set values we'll need to reuse for the follow up Review
    const followUpGranteeId = uuidv4();
    const followUpFindingId = uuidv4();

    // FollowUpGrant.
    const followUpCitation = [
      {
        findingId: followUpFindingId,
        citationText: 'Corrected Citation',
        monitoringFindingType: 'Material Weakness',
        monitoringFindingStatusName: 'Corrected',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];

    await createMonitoringData(
      followUpGrant.number,
      8,
      new Date(),
      'AIAN-DEF',
      'Complete',
      followUpCitation,
      followUpGranteeId
    );
    // Set up for the follow-up review that links to the same finding
    const followUpReviewId = uuidv4();

    // Create a new follow-up active Review
    // It should show as more 'recent' than the Complete Review because it
    // will have a fractionally later sourceCreatedAt and a higher id
    await MonitoringReviewGrantee.create(
      {
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: followUpGrant.number,
        reviewId: followUpReviewId,
        granteeId: followUpGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    await MonitoringReview.create(
      {
        reviewId: followUpReviewId,
        contentId: faker.datatype.uuid(),
        statusId: 9,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        // There is no reportDeliveryDate for active Reviews
        // reportDeliveryDate,
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    await MonitoringReviewStatus.create(
      {
        statusId: 9,
        name: 'In Progress',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    // Link the Corrected Finding to the new review
    await MonitoringFindingHistory.create(
      {
        reviewId: followUpReviewId,
        findingHistoryId: uuidv4(),
        findingId: followUpFindingId,
        statusId: faker.datatype.number({ min: 9999 }),
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      { individualHooks: true }
    );

    // Multi-review scenario: one finding with two delivered reviews.
    // The citations service should return the review that was current as of reportStartDate.
    const multiReviewGranteeId = uuidv4();
    const multiReviewFindingId = uuidv4();

    // First review: delivered 2025-01-22.
    await createMonitoringData(
      multiReviewGrant.number,
      10,
      new Date('2025-01-22'),
      'FA-1',
      'Complete',
      [
        {
          findingId: multiReviewFindingId,
          citationText: 'Multi Review Citation',
          monitoringFindingType: 'Noncompliance',
          monitoringFindingStatusName: 'Active',
          monitoringFindingGrantFindingType: 'Corrective Action',
        },
      ],
      multiReviewGranteeId,
      'Multi Review Initial'
    );

    // Second review: follow-up delivered 2025-06-01, same finding.
    const multiReviewId2 = uuidv4();

    await MonitoringReviewGrantee.create(
      {
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: multiReviewGrant.number,
        reviewId: multiReviewId2,
        granteeId: multiReviewGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    await MonitoringReview.create(
      {
        reviewId: multiReviewId2,
        contentId: faker.datatype.uuid(),
        statusId: 11,
        name: 'Multi Review Follow-up',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-15'),
        reviewType: 'FA-2',
        reportDeliveryDate: new Date('2025-06-01'),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    await MonitoringReviewStatus.create(
      {
        statusId: 11,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    await MonitoringFindingHistory.create(
      {
        reviewId: multiReviewId2,
        findingHistoryId: uuidv4(),
        findingId: multiReviewFindingId,
        statusId: faker.datatype.number({ min: 9999 }),
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      { individualHooks: true }
    );

    // Suppressed grant: review delivered 2025-02-01, well before today.
    // The closed goal's performedAt defaults to now (today), so last_closed_goal::date > latest
    // delivery date, and citations_live_values suppresses the citation.
    await createMonitoringData(
      suppressedGrant.number,
      12,
      new Date('2025-02-01'),
      'FA-1',
      'Complete',
      [
        {
          citationText: 'Suppressed Citation',
          monitoringFindingType: 'Noncompliance',
          monitoringFindingStatusName: 'Active',
          monitoringFindingGrantFindingType: 'Corrective Action',
        },
      ]
    );

    // Cross-grant test: citation is in GrantCitations for crossGrant (via the finding's
    // granteeId), but the only delivered review is in GrantDeliveredReviews for
    // crossGrantOtherGrant. The GrantDeliveredReviews join in the service should exclude
    // the citation when querying crossGrant.
    const crossGrantRecipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });
    const crossGrantNumber = faker.datatype.string(8);
    const crossGrantOtherGrantNumber = faker.datatype.string(8);
    [crossGrant, crossGrantOtherGrant] = await Grant.bulkCreate([
      {
        id: faker.datatype.number({ min: 9999 }),
        number: crossGrantNumber,
        recipientId: crossGrantRecipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        id: faker.datatype.number({ min: 9999 }),
        number: crossGrantOtherGrantNumber,
        recipientId: crossGrantRecipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
    ]);
    await Goal.create({
      name: 'Cross Grant Monitoring Goal',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: crossGrant.id,
      createdAt: new Date(),
      onApprovedAR: true,
      createdVia: 'monitoring',
      goalTemplateId: monitoringGoalTemplate.id,
    });

    const crossGrantGranteeId = uuidv4();
    const crossGrantOtherGranteeId = uuidv4();
    const crossGrantStubReviewId = uuidv4();
    const crossGrantOtherDeliveredReviewId = uuidv4();
    const crossGrantFindingId = uuidv4();
    const crossGrantStubStatusId = faker.datatype.number({ min: 9999 });
    const crossGrantOtherStatusId = faker.datatype.number({ min: 9999 });
    const crossGrantFindingStatusId = faker.datatype.number({ min: 9999 });
    const crossGrantStandardId = faker.datatype.number({ min: 9999 });

    // Stub review for crossGrant — exists only to satisfy the FK in MonitoringReviewGrantee
    // and give the fact table an entry that links crossGrantGranteeId to crossGrantNumber.
    await MonitoringReview.create(
      {
        reviewId: crossGrantStubReviewId,
        contentId: faker.datatype.uuid(),
        statusId: crossGrantStubStatusId,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringReviewStatus.create(
      {
        statusId: crossGrantStubStatusId,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringReviewGrantee.create(
      {
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: crossGrantNumber,
        reviewId: crossGrantStubReviewId,
        granteeId: crossGrantGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    // Delivered review for crossGrantOtherGrant — this is the review that actually
    // reports the finding.
    await MonitoringReview.create(
      {
        reviewId: crossGrantOtherDeliveredReviewId,
        contentId: faker.datatype.uuid(),
        statusId: crossGrantOtherStatusId,
        name: 'Cross Review On Other Grant',
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringReviewStatus.create(
      {
        statusId: crossGrantOtherStatusId,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringReviewGrantee.create(
      {
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: crossGrantOtherGrantNumber,
        reviewId: crossGrantOtherDeliveredReviewId,
        granteeId: crossGrantOtherGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );

    // Finding reported in crossGrantOtherGrant's review, but granteeId links to crossGrant.
    await MonitoringFinding.create(
      {
        findingId: crossGrantFindingId,
        statusId: crossGrantFindingStatusId,
        findingType: 'Noncompliance',
        hash: faker.datatype.uuid(),
        source: 'Internal Controls',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringFindingStatus.create(
      {
        statusId: crossGrantFindingStatusId,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringFindingHistory.create(
      {
        reviewId: crossGrantOtherDeliveredReviewId,
        findingHistoryId: uuidv4(),
        findingId: crossGrantFindingId,
        statusId: crossGrantFindingStatusId,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      { individualHooks: true }
    );
    await MonitoringFindingGrant.create(
      {
        findingId: crossGrantFindingId,
        granteeId: crossGrantGranteeId,
        statusId: crossGrantFindingStatusId,
        findingType: 'Noncompliance',
        source: 'Discipline',
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      { individualHooks: true }
    );
    await MonitoringFindingStandard.create(
      {
        findingId: crossGrantFindingId,
        standardId: crossGrantStandardId,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      { individualHooks: true }
    );
    await MonitoringStandard.create(
      {
        standardId: crossGrantStandardId,
        citation: 'Cross Grant Cross Review Citation',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        contentId: uuidv4(),
        hash: uuidv4(),
        text: faker.random.words(10),
        citable: 1,
      },
      { individualHooks: true }
    );

    // Refresh the materialized view.
    await GrantRelationshipToActive.refresh();

    // Populate fact tables so the refactored service can query them.
    await updateMonitoringFactTables();
  });

  afterAll(async () => {
    // NOTE: rollbackToSnapshot processes ZAL audit entries in reverse timestamp order.
    // When parent link-table rows (e.g. MonitoringFindingStatusLinks, MonitoringStandardLinks)
    // share a millisecond timestamp with the child rows that reference them, the deletion
    // order is not guaranteed, causing FK constraint violations on cleanup.
    // All test assertions pass; only the afterAll teardown fails.
    // The real fix belongs in programmaticTransaction.ts — revertAllChanges should
    // catch SequelizeForeignKeyConstraintError and defer those deletions to a retry pass
    // rather than aborting immediately.
    await rollbackToSnapshot(snapShot);
  });

  it('getCitationsByGrantIds', async () => {
    // Call the service to get the citations by grant ids.
    // get todays date in YYYY-MM-DD for the last possible hour of the day.
    const reportStartDate = new Date().toISOString().split('T')[0];
    const citationsToAssert = await getCitationsByGrantIds(
      [grant1.id, grant1a.id, grant2.id, grant3.id],
      reportStartDate
    );

    // grant1 and grant1s have monitoring goals; grant2 and grant3 do not
    // grant1 has 2 active, non-deleted citations and grant1a has 1.
    expect(citationsToAssert.length).toBe(3);

    // The source-deleted citation must be excluded entirely.
    const deletedCitation = citationsToAssert.find(
      (c) => c.citation === 'Grant 1 - Citation 4 - Deleted'
    );
    expect(deletedCitation).toBeUndefined();

    // Assert the citations.
    // Get the citation with the text 'Grant 1 - Citation 1 - Good'.
    const citation1 = citationsToAssert.find((c) => c.citation === 'Grant 1 - Citation 1 - Good');
    expect(citation1).toBeDefined();
    expect(citation1.grants.length).toBe(1);
    expect(citation1.grants[0].findingId).toBeDefined();
    expect(citation1.grants[0].grantId).toBe(grant1.id);
    expect(citation1.grants[0].grantNumber).toBe(grant1.number);
    expect(citation1.grants[0].reviewName).toBeDefined();
    expect(citation1.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation1.grants[0].findingType).toBe('Citation 1 Monitoring Finding Type');
    expect(citation1.grants[0].findingSource).toBe('Internal Controls');
    expect(citation1.grants[0].monitoringFindingStatusName).toBe('Active');
    expect(citation1.grants[0].name).toBe('AOC - Grant 1 - Citation 1 - Good - Internal Controls');

    // Get the citation with the text 'Grant 1 - Citation 3 - Good 2'.
    const citation2 = citationsToAssert.find((c) => c.citation === 'Grant 1 - Citation 3 - Good 2');

    expect(citation2).toBeDefined();
    expect(citation2.grants.length).toBe(1);
    expect(citation2.grants[0].findingId).toBeDefined();
    expect(citation2.grants[0].grantId).toBe(grant1.id);
    expect(citation2.grants[0].grantNumber).toBe(grant1.number);
    expect(citation2.grants[0].reviewName).toBeDefined();
    expect(citation2.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation2.grants[0].findingType).toBe('Citation 3 Monitoring Finding Type');

    // Get the citation with the text 'Grant 1a - Citation 1 - Good'.
    const citation3 = citationsToAssert.find((c) => c.citation === 'Grant 1a - Citation 1 - Good');
    expect(citation3).toBeDefined();
    expect(citation3.grants.length).toBe(1);
    expect(citation3.grants[0].findingId).toBeDefined();
    expect(citation3.grants[0].grantId).toBe(grant1a.id);
    expect(citation3.grants[0].grantNumber).toBe(grant1a.number);
    expect(citation3.grants[0].reviewName).toBeDefined();
    expect(citation3.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation3.grants[0].findingType).toBe('Citation 4 Monitoring Finding Type');
  });

  it('gets the citations that are corrected but linked to a follow-up review', async () => {
    const reportStartDate = new Date().toISOString().split('T')[0];
    const citationsToAssert = await getCitationsByGrantIds([followUpGrant.id], reportStartDate);

    // Assert correct number of citations.
    expect(citationsToAssert.length).toBe(1);

    // Assert the citations.
    // Get the citation with the text 'Corrected Citation'.
    const citation1 = citationsToAssert.find((c) => c.citation === 'Corrected Citation');
    expect(citation1).toBeDefined();
    expect(citation1.grants.length).toBe(1);
    expect(citation1.grants[0].findingId).toBeDefined();
    expect(citation1.grants[0].grantId).toBe(followUpGrant.id);
    expect(citation1.grants[0].grantNumber).toBe(followUpGrant.number);
    expect(citation1.grants[0].reviewName).toBeDefined();
    expect(citation1.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation1.grants[0].findingType).toBe('Material Weakness');
    expect(citation1.grants[0].findingSource).toBe('Internal Controls');
    expect(citation1.grants[0].monitoringFindingStatusName).toBe('Corrected');
    expect(citation1.grants[0].name).toBe('AOC - Corrected Citation - Internal Controls');
  });

  it('returns the review current as of reportStartDate when a finding has multiple delivered reviews', async () => {
    // After the follow-up review (2025-06-01): should return 'Multi Review Follow-up'
    const today = new Date().toISOString().split('T')[0];
    const citationsToday = await getCitationsByGrantIds([multiReviewGrant.id], today);
    expect(citationsToday.length).toBe(1);
    expect(citationsToday[0].citation).toBe('Multi Review Citation');
    expect(citationsToday[0].grants.length).toBe(1);
    expect(citationsToday[0].grants[0].reviewName).toBe('Multi Review Follow-up');

    // Before the follow-up review (2025-03-01): should return 'Multi Review Initial'
    const citationsMid = await getCitationsByGrantIds([multiReviewGrant.id], '2025-03-01');
    expect(citationsMid.length).toBe(1);
    expect(citationsMid[0].grants[0].reviewName).toBe('Multi Review Initial');
  });

  it('does not return citations where the monitoring goal was closed after the latest delivery date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const results = await getCitationsByGrantIds([suppressedGrant.id], today);
    expect(results.length).toBe(0);
  });

  it('does not return citations where the review is on a different grant', async () => {
    const today = new Date().toISOString().split('T')[0];
    // crossGrant has GrantCitations for the finding (via the granteeId linkage),
    // but the only delivered review is on crossGrantOtherGrant.
    // The GrantDeliveredReviews join should exclude the citation.
    const results = await getCitationsByGrantIds([crossGrant.id], today);
    expect(results.length).toBe(0);
  });

  describe('textByCitation', () => {
    it('gets text by citation', async () => {
      const response = await textByCitation(['Grant 2 - Citation 1 - Good']);

      expect(response.map((citation) => citation.toJSON())).toStrictEqual([
        {
          citation: 'Grant 2 - Citation 1 - Good',
          text: expect.any(String),
        },
      ]);
    });
  });
});
