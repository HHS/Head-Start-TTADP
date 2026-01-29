/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
import { v4 as uuidv4 } from 'uuid';
import faker from '@faker-js/faker';
import { getCitationsByGrantIds, textByCitation } from './citations';
import db, {
  Recipient,
  Grant,
  MonitoringReviewGrantee,
  MonitoringReview,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingStatus,
  MonitoringReviewStatus,
  MonitoringFindingStandard,
  MonitoringStandard,
  MonitoringFindingGrant,
  GoalTemplate,
  Goal,
  GrantRelationshipToActive,
  GrantReplacements,
} from '../models';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';

// create a function to create a citation for a grant.
const createMonitoringData = async (
  grantNUmber, // Grant Number.
  reviewStatusId, // Status ID.
  reportDeliveryDate, // Report Delivery Date must be between start cutoff and todays date.
  reviewType, // Review Type must be in ('AIAN-DEF', 'RAN', 'Follow-up', 'FA-1', 'FA1-FR', 'FA-2', 'FA2-CR', 'Special')
  monitoringReviewStatusName, // Monitoring Review Status Name must be 'Complete'.
  citationsArray, // Array of citations to create.
  granteeId = uuidv4(),
) => {
  const reviewId = uuidv4();

  // MonitoringReviewGrantee.
  await MonitoringReviewGrantee.create({
    id: faker.datatype.number({ min: 9999 }),
    grantNumber: grantNUmber,
    reviewId,
    granteeId,
    createTime: new Date(),
    updateTime: new Date(),
    updateBy: 'Support Team',
    sourceCreatedAt: new Date(),
    sourceUpdatedAt: new Date(),
  }, { individualHooks: true });

  // MonitoringReview.
  await MonitoringReview.create({
    reviewId,
    contentId: faker.datatype.uuid(),
    statusId: reviewStatusId,
    name: faker.random.words(3),
    startDate: new Date(),
    endDate: new Date(),
    reviewType,
    reportDeliveryDate,
    reportAttachmentId: faker.datatype.uuid(),
    outcome: faker.random.words(5),
    hash: faker.datatype.uuid(),
    sourceCreatedAt: new Date(),
    sourceUpdatedAt: new Date(),
  }, { individualHooks: true });

  // MonitoringReviewStatus.
  await MonitoringReviewStatus.create({
    statusId: reviewStatusId,
    name: monitoringReviewStatusName,
    sourceCreatedAt: new Date(),
    sourceUpdatedAt: new Date(),
  }, { individualHooks: true });

  // MonitoringFindingHistory (this is the primary finding table and the relationship to citation is 1<>1).
  // If we wanted one grant to have multiple citations, we would need to create multiple findings here and below.
  await Promise.all(citationsArray.map(async (citation) => {
    const sourceDeletedAt = citation.sourceDeletedAt || null;
    const findingId = citation.findingId || uuidv4();
    const findingStatusId = faker.datatype.number({ min: 9999 });
    await MonitoringFindingHistory.create({
      reviewId,
      findingHistoryId: uuidv4(),
      findingId,
      statusId: findingStatusId,
      narrative: faker.random.words(10),
      ordinal: faker.datatype.number({ min: 1, max: 10 }),
      determination: faker.random.words(5),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt,
    }, { individualHooks: true });

    // MonitoringFinding.
    await MonitoringFinding.create({
      findingId,
      statusId: findingStatusId,
      findingType: citation.monitoringFindingType,
      hash: faker.datatype.uuid(),
      source: 'Internal Controls',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt,
    }, { individualHooks: true });

    // MonitoringFindingStatus.
    await MonitoringFindingStatus.create({
      statusId: findingStatusId,
      name: citation.monitoringFindingStatusName,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    // MonitoringFindingGrant.
    await MonitoringFindingGrant.create({
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
    }, { individualHooks: true });

    // MonitoringFindingStandard (this table joins a finding to a standard (citation)).
    const standardId = faker.datatype.number({ min: 9999 });
    const citable = faker.datatype.number({ min: 1, max: 10 });
    await MonitoringFindingStandard.create({
      findingId,
      standardId, // Integer
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    // MonitoringStandard.
    await MonitoringStandard.create({
      standardId,
      citation: citation.citationText,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      contentId: uuidv4(),
      hash: uuidv4(),
      text: faker.random.words(10),
      citable,
    }, { individualHooks: true });
  }));
};

describe('citations service', () => {
  let snapShot;

  let recipient1;
  let recipient2;
  let recipient3;

  let followUpRecipient;

  let grant1; // Recipient 1
  let grant1a; // Recipient 1
  let grant2; // Recipient 2
  let grant3; // Recipient 2 (Inactive)

  let grant4Original;
  let grant4Replacement;

  let followUpGrant;

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

    const grantNumber4Original = faker.datatype.string(8);
    const grantNumber4Replacement = faker.datatype.string(8);

    const followUpGrantNumber = faker.datatype.string(8);

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

    // Recipients 3.
    recipient3 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    // FollowUpRecipient.
    followUpRecipient = await Recipient.create({
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
      // Grant 4 for Recipient 3 (original).
      {
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber4Original,
        recipientId: recipient3.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      // Grant 4 for Recipient 3 (replacement).
      {
        id: faker.datatype.number({ min: 9999 }),
        number: followUpGrantNumber,
        recipientId: recipient3.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      // Followup Grant for FollowUp Recipient 3.
      {
        id: faker.datatype.number({ min: 9999 }),
        number: grantNumber4Replacement,
        recipientId: followUpRecipient.id,
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

    // Replacement citations test.
    grant4Original = grants[4];
    grant4Replacement = grants[5];

    // FollowUpGrant
    followUpGrant = grants[6];

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

    // Regular goal for grant 4 being replaced.
    await Goal.create({
      name: 'Regular Goal 4 Original',
      status: 'In Progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant4Original.id,
      createdAt: '2024-11-26T19:16:15.842Z',
      onApprovedAR: true,
      createdVia: 'activityReport',
    });

    // Replacement goal for grant 4 monitoring.
    await Goal.create({
      name: 'Monitoring Goal 4 replacement',
      status: 'Not started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      grantId: grant4Replacement.id,
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
    await createMonitoringData(grant1.number, 1, new Date(), 'AIAN-DEF', 'Complete', grant1Citations1);

    // Grant 1a (make sure other grant citations comeback).
    const grant1Citations1a = [
      {
        citationText: 'Grant 1a - Citation 1 - Good',
        monitoringFindingType: 'Citation 4 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Grant 1a Corrective Action',
      },
    ];
    await createMonitoringData(grant1a.number, 2, new Date(), 'AIAN-DEF', 'Complete', grant1Citations1a);

    // Grant 2.
    const grant1Citations2 = [
      {
        citationText: 'Grant 2 - Citation 1 - Good',
        monitoringFindingType: 'citation 5 Monitoring Finding Type',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];
    // Before delivery date.
    await createMonitoringData(grant2.number, 3, new Date('2024-09-01'), 'AIAN-DEF', 'Complete', grant1Citations2);
    // After delivery date (tomorrow).
    await createMonitoringData(grant2.number, 4, new Date(new Date().setDate(new Date().getDate() + 1)), 'AIAN-DEF', 'Complete', grant1Citations2);

    // Grant 3 (inactive).
    const grant1Citations3 = [
      {
        citationText: 'Grant 3 - Citation 1 - Good',
        monitoringFindingType: 'Material Weakness',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];
    await createMonitoringData(grant3.number, 5, new Date(), 'AIAN-DEF', 'Complete', grant1Citations3);

    // Create Grant Replacement data.
    await GrantReplacements.create({
      replacedGrantId: grant4Original.id,
      replacingGrantId: grant4Replacement.id,
      replacementDate: new Date(),
    });

    // Grant 4 original.
    const grant1Citations4Original = [
      {
        citationText: 'Grant 4 ON REPLACED - Citation 1 - Good',
        monitoringFindingType: 'Material Weakness',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];
    await createMonitoringData(grant4Original.number, 6, new Date(), 'AIAN-DEF', 'Complete', grant1Citations4Original);

    // Grant 4 replacement.
    const grant1Citations4Replacement = [
      {
        citationText: 'Grant 4 replacement - Citation 1 - Good',
        monitoringFindingType: 'Material Weakness',
        monitoringFindingStatusName: 'Active',
        monitoringFindingGrantFindingType: 'Corrective Action',
      },
    ];

    await createMonitoringData(grant4Replacement.number, 7, new Date(), 'AIAN-DEF', 'Complete', grant1Citations4Replacement);

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

    await createMonitoringData(followUpGrant.number, 8, new Date(), 'AIAN-DEF', 'Complete', followUpCitation, followUpGranteeId);
    // Set up for the follow-up review that links to the same finding
    const followUpReviewId = uuidv4();

    // Create a new follow-up active Review
    // It should show as more 'recent' than the Complete Review because it
    // will have a fractionally later sourceCreatedAt and a higher id
    await MonitoringReviewGrantee.create({
      id: faker.datatype.number({ min: 9999 }),
      grantNumber: followUpGrant.number,
      reviewId: followUpReviewId,
      granteeId: followUpGranteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Support Team',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    await MonitoringReview.create({
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
    }, { individualHooks: true });

    await MonitoringReviewStatus.create({
      statusId: 9,
      name: 'In Progress',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    // Link the Corrected Finding to the new review
    await MonitoringFindingHistory.create({
      reviewId: followUpReviewId,
      findingHistoryId: uuidv4(),
      findingId: followUpFindingId,
      statusId: faker.datatype.number({ min: 9999 }),
      narrative: faker.random.words(10),
      ordinal: faker.datatype.number({ min: 1, max: 10 }),
      determination: faker.random.words(5),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    }, { individualHooks: true });

    // Refresh the materialized view.
    await GrantRelationshipToActive.refresh();
  });

  afterAll(async () => {
    // Rollback any changes made to the database during the test.
    await rollbackToSnapshot(snapShot);
  });

  it('getCitationsByGrantIds', async () => {
    // Call the service to get the citations by grant ids.
    // get todays date in YYYY-MM-DD for the last possible hour of the day.
    const reportStartDate = new Date().toISOString().split('T')[0];
    const citationsToAssert = await getCitationsByGrantIds([grant1.id, grant1a.id, grant2.id, grant3.id], reportStartDate);

    // grant1 and grant1s have monitoring goals; grant2 and grant3 do not
    // grant1 has 2 active, non-deleted citations and grant1a has 1.
    expect(citationsToAssert.length).toBe(3);

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

  it('gets the citations linked to a grant that has been replaced by another grant', async () => {
    const reportStartDate = new Date().toISOString().split('T')[0];
    const citationsToAssert = await getCitationsByGrantIds([grant4Replacement.id], reportStartDate);

    // Assert correct number of citations.
    expect(citationsToAssert.length).toBe(2);

    // Assert the citations.
    // Get the citation with the text 'Grant 4 replacement - Citation 1 - Good'.
    const citation1 = citationsToAssert.find((c) => c.citation === 'Grant 4 replacement - Citation 1 - Good');
    expect(citation1).toBeDefined();
    expect(citation1.grants.length).toBe(1);
    expect(citation1.grants[0].findingId).toBeDefined();
    expect(citation1.grants[0].grantId).toBe(grant4Replacement.id);
    expect(citation1.grants[0].grantNumber).toBe(grant4Replacement.number);
    expect(citation1.grants[0].reviewName).toBeDefined();
    expect(citation1.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation1.grants[0].findingType).toBe('Material Weakness');
    expect(citation1.grants[0].findingSource).toBe('Internal Controls');
    expect(citation1.grants[0].monitoringFindingStatusName).toBe('Active');

    // Get the citation with the text 'Grant 4 ON REPLACED - Citation 1 - Good'.
    const citation2 = citationsToAssert.find((c) => c.citation === 'Grant 4 ON REPLACED - Citation 1 - Good');
    expect(citation2).toBeDefined();
    expect(citation2.grants.length).toBe(1);
    expect(citation2.grants[0].findingId).toBeDefined();
    expect(citation2.grants[0].grantId).toBe(grant4Original.id);
    expect(citation2.grants[0].grantNumber).toBe(grant4Original.number); // ?
    expect(citation2.grants[0].reviewName).toBeDefined();
    expect(citation2.grants[0].reportDeliveryDate).toBeDefined();
    expect(citation2.grants[0].findingType).toBe('Material Weakness');
    expect(citation2.grants[0].findingSource).toBe('Internal Controls');
    expect(citation2.grants[0].monitoringFindingStatusName).toBe('Active');
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
  });

  describe('textByCitation', () => {
    it('gets text by citation', async () => {
      const response = await textByCitation(['Grant 2 - Citation 1 - Good']);

      expect(response.map((citation) => citation.toJSON())).toStrictEqual([
        {
          citation: 'Grant 2 - Citation 1 - Good',
          text: expect.any(String),
        },
        {
          citation: 'Grant 2 - Citation 1 - Good',
          text: expect.any(String),
        },
      ]);
    });
  });
});
