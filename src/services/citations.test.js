/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
import { v4 as uuidv4 } from 'uuid';
import faker from '@faker-js/faker';
import { getCitationsByGrantIds } from './citations';
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
) => {
  const reviewId = uuidv4();
  const granteeId = uuidv4();

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
    const findingId = uuidv4();
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
      sourceDeletedAt: null,
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
      citable,
    }, { individualHooks: true });
  }));
};

describe('citations service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });
  describe('getCitationsByGrantIds()', () => {
    let snapShot;

    let recipient1;
    let recipient2;

    let grant1; // Recipient 1
    let grant1a; // Recipient 1
    let grant2; // Recipient 2
    let grant3; // Recipient 2 (Inactive)

    beforeAll(async () => {
      // Capture a snapshot of the database before running the test.
      snapShot = await captureSnapshot();

      // Grant Numbers.
      const grantNumber1 = faker.datatype.string(8);
      const grantNumber1a = faker.datatype.string(8);
      const grantNumber2 = faker.datatype.string(8);
      const grantNumber3 = faker.datatype.string(8);

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
      ]);

      // set the grants.
      grant1 = grants[0];
      grant1a = grants[1];
      grant2 = grants[2];
      grant3 = grants[3];

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
    });

    afterAll(async () => {
      // Rollback any changes made to the database during the test.
      await rollbackToSnapshot(snapShot);
    });

    it('correctly retrieves citations per grant', async () => {
      // Call the service to get the citations by grant ids.
      // get todays date in YYYY-MM-DD for the last possible hour of the day.
      const reportStartDate = new Date().toISOString().split('T')[0];
      const citationsToAssert = await getCitationsByGrantIds([grant1.id, grant1a.id, grant2.id, grant3.id], reportStartDate);

      // Assert correct number of citations.
      expect(citationsToAssert.length).toBe(3);

      // Assert the citations.
      expect(citationsToAssert[0].citation).toBe('Grant 1 - Citation 1 - Good');
      expect(citationsToAssert[0].grants.length).toBe(1);
      expect(citationsToAssert[0].grants[0].findingId).toBeDefined();
      expect(citationsToAssert[0].grants[0].grantId).toBe(grant1.id);
      expect(citationsToAssert[0].grants[0].grantNumber).toBe(grant1.number);
      expect(citationsToAssert[0].grants[0].reviewName).toBeDefined();
      expect(citationsToAssert[0].grants[0].reportDeliveryDate).toBeDefined();
      expect(citationsToAssert[0].grants[0].findingType).toBe('Citation 1 Monitoring Finding Type');
      expect(citationsToAssert[0].grants[0].findingSource).toBe('Internal Controls');
      expect(citationsToAssert[0].grants[0].monitoringFindingStatusName).toBe('Active');

      expect(citationsToAssert[1].citation).toBe('Grant 1 - Citation 3 - Good 2');
      expect(citationsToAssert[1].grants.length).toBe(1);
      expect(citationsToAssert[1].grants[0].findingId).toBeDefined();
      expect(citationsToAssert[1].grants[0].grantId).toBe(grant1.id);
      expect(citationsToAssert[1].grants[0].grantNumber).toBe(grant1.number);
      expect(citationsToAssert[1].grants[0].reviewName).toBeDefined();
      expect(citationsToAssert[1].grants[0].reportDeliveryDate).toBeDefined();
      expect(citationsToAssert[1].grants[0].findingType).toBe('Citation 3 Monitoring Finding Type');

      expect(citationsToAssert[2].citation).toBe('Grant 1a - Citation 1 - Good');
      expect(citationsToAssert[2].grants.length).toBe(1);
      expect(citationsToAssert[2].grants[0].findingId).toBeDefined();
      expect(citationsToAssert[2].grants[0].grantId).toBe(grant1a.id);
      expect(citationsToAssert[2].grants[0].grantNumber).toBe(grant1a.number);
      expect(citationsToAssert[2].grants[0].reviewName).toBeDefined();
      expect(citationsToAssert[2].grants[0].reportDeliveryDate).toBeDefined();
      expect(citationsToAssert[2].grants[0].findingType).toBe('Citation 4 Monitoring Finding Type');
    });
  });
});
