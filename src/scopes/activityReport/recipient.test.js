/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  OtherEntity,
  Recipient,
  Grant,
  draftReport,
  faker,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('recipient filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('recipient', () => {
    describe('for otherEntities', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let otherEntityIncluded1;
      let otherEntityIncluded2;
      let otherEntityExcluded;

      let possibleIds;

      beforeAll(async () => {
        otherEntityIncluded1 = await OtherEntity.create({ id: 40, name: 'test' });
        otherEntityIncluded2 = await OtherEntity.create({ id: 41, name: 'another test' });
        otherEntityExcluded = await OtherEntity.create({ id: 42, name: 'otherEntity' });

        reportIncluded1 = await ActivityReport.create({ ...draftReport });
        reportIncluded2 = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          otherEntityId: otherEntityIncluded1.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          otherEntityId: otherEntityIncluded2.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          otherEntityId: otherEntityExcluded.id,
        });
        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          sharedTestData.globallyExcludedReport.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await OtherEntity.destroy({
          where: { id: [otherEntityIncluded1.id, otherEntityIncluded2.id, otherEntityExcluded.id] },
        });
      });

      it('includes other-entities with a partial match', async () => {
        const filters = { 'recipient.ctn': ['test'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes other-entities that do not partial match or have no other-entities', async () => {
        const filters = { 'recipient.nctn': ['test'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, sharedTestData.globallyExcludedReport.id]));
      });
    });

    describe('for grants', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let recipientIncluded1;
      let recipientIncluded2;
      let recipientExcluded;

      let grantIncluded1;
      let grantIncluded2;
      let grantExcluded;

      let possibleIds;

      beforeAll(async () => {
        recipientIncluded1 = await Recipient.create({ id: 50, name: '1234', uei: 'NNA5N2KHMGN2' });
        recipientIncluded2 = await Recipient.create({ id: 51, name: 'testing 1234', uei: 'NNA5N2KHMBA2' });
        recipientExcluded = await Recipient.create({ id: 52, name: '4321', uei: 'NNA5N2KHMBC2' });

        grantIncluded1 = await Grant.create({
          id: recipientIncluded1.id, number: 1234, recipientId: recipientIncluded1.id,
        });
        grantIncluded2 = await Grant.create({
          id: recipientIncluded2.id, number: 1235, recipientId: recipientIncluded2.id,
        });
        grantExcluded = await Grant.create({
          id: recipientExcluded.id, number: 456, recipientId: recipientExcluded.id,
        });

        reportIncluded1 = await ActivityReport.create({ ...draftReport });
        reportIncluded2 = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          grantId: grantIncluded1.id,
        });

        await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          grantId: grantIncluded2.id,
        });

        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });

        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          sharedTestData.globallyExcludedReport.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: [recipientIncluded1.id, recipientIncluded2.id, recipientExcluded.id] },
        });
      });

      it('includes recipients with a partial match', async () => {
        const filters = { 'recipient.ctn': ['1234'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes recipients that do not partial match or have no recipients', async () => {
        const filters = { 'recipient.nctn': ['1234'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, sharedTestData.globallyExcludedReport.id]));
      });

      it('grant number with matches', async () => {
        const filters = { 'grantNumber.ctn': ['123'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('grant number with no matches', async () => {
        const filters = { 'grantNumber.ctn': ['789'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(0);
      });

      it('grant numbers excludes matches', async () => {
        const filters = { 'grantNumber.nctn': ['123'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, sharedTestData.globallyExcludedReport.id]));
      });
    });

    describe('single or multi recipient', () => {
      let multiRecipientReport;
      let singleRecipientReport;
      let excludedReport;

      let multiRecipient1;
      let multiRecipient2;

      let singleRecipient;
      let singleRecipient2; // Same UEI.

      let excludedRecipient;

      let multiRecipientGrant1;
      let multiRecipientGrant2;
      let singleRecipientGrant;
      let singleRecipientGrant2;
      let excludedGrant;

      let recipientIds;
      let grantIds;
      let reportIds;

      beforeAll(async () => {
        // Recipients.
        multiRecipient1 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
        });
        multiRecipient2 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: faker.datatype.string(12),
        });
        singleRecipient = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: 'sample-single-recipient-same-uei',
        });
        singleRecipient2 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: 'sample-single-recipient-same-uei',
        });
        excludedRecipient = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: faker.datatype.string(12),
        });

        recipientIds = [
          multiRecipient1.id,
          multiRecipient2.id,
          singleRecipient.id,
          singleRecipient2.id,
          excludedRecipient.id,
        ];

        // Grants.
        multiRecipientGrant1 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: multiRecipient1.id,
        });
        multiRecipientGrant2 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: multiRecipient2.id,
        });
        singleRecipientGrant = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: singleRecipient.id,
        });
        singleRecipientGrant2 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: singleRecipient2.id,
        });
        excludedGrant = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: excludedRecipient.id,
        });

        grantIds = [
          multiRecipientGrant1.id,
          multiRecipientGrant2.id,
          singleRecipientGrant.id,
          singleRecipientGrant2.id,
          excludedGrant.id,
        ];

        // Reports.
        multiRecipientReport = await ActivityReport.create({ ...draftReport });
        singleRecipientReport = await ActivityReport.create({ ...draftReport });
        excludedReport = await ActivityReport.create({ ...draftReport });

        reportIds = [multiRecipientReport.id, singleRecipientReport.id, excludedReport.id];

        // Activity Recipients.
        await ActivityRecipient.create({
          activityReportId: multiRecipientReport.id,
          grantId: multiRecipientGrant1.id,
        });

        await ActivityRecipient.create({
          activityReportId: multiRecipientReport.id,
          grantId: multiRecipientGrant2.id,
        });

        await ActivityRecipient.create({
          activityReportId: singleRecipientReport.id,
          grantId: singleRecipientGrant.id,
        });

        // Same UEI should count as single recipient.
        await ActivityRecipient.create({
          activityReportId: singleRecipientReport.id,
          grantId: singleRecipientGrant2.id,
        });

        await ActivityRecipient.create({
          activityReportId: excludedReport.id,
          grantId: excludedGrant.id,
        });
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: reportIds,
          },
        });
        await ActivityReport.destroy({
          where: { id: reportIds },
        });
        await Grant.destroy({
          where: { id: grantIds },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: recipientIds },
        });
      });

      it('retrieves reports with more than one recipient', async () => {
        const filters = { 'singleOrMultiRecipients.in': ['multi-recipients'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: reportIds }] },
        });
        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([multiRecipientReport.id]));
      });

      it('retrieves reports with one recipient', async () => {
        const filters = { 'singleOrMultiRecipients.in': ['single-recipient'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: reportIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([singleRecipientReport.id, excludedReport.id]));
      });
    });

    describe('recipientId', () => {
      let reportIncluded;
      let reportExcluded;

      let recipientIncluded;
      let recipientExcluded;

      let grantIncluded;
      let grantExcluded;

      let possibleIds;

      beforeAll(async () => {
        recipientIncluded = await Recipient.create({ id: 54, name: '1234', uei: 'NNA5N2KHMGN2' });
        recipientExcluded = await Recipient.create({ id: 56, name: '4321', uei: 'NNA5N2KHMBA2' });

        grantIncluded = await Grant.create({
          id: recipientIncluded.id, number: 2234, recipientId: recipientIncluded.id,
        });
        grantExcluded = await Grant.create({
          id: recipientExcluded.id, number: 2236, recipientId: recipientExcluded.id,
        });

        reportIncluded = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded.id,
          grantId: grantIncluded.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });
        possibleIds = [
          reportIncluded.id,
          reportExcluded.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded.id, grantExcluded.id] },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: [recipientIncluded.id, recipientExcluded.id] },
        });
      });

      it('includes recipients with a matching id', async () => {
        const filters = { 'recipientId.ctn': [recipientIncluded.id] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded.id]));
      });
    });
  });
});
