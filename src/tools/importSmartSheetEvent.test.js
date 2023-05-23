/* eslint-disable no-console */
import { readFileSync } from 'fs';
import parse from 'csv-parse/lib/sync';
import { Op } from 'sequelize';
import importSmartSheetEvent from './importSmartSheetEvent';
import { downloadFile } from '../lib/s3';
import db, {
  EventReportPilot,
  User,
} from '../models';
import { logger } from '../logger';

jest.mock('../logger');

jest.mock('../lib/s3');

jest.mock('bull');
describe('Import Smart Sheet Events', () => {
  beforeEach(async () => {
    downloadFile.mockReset();
  });
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('imports events correctly', () => {
    let preExistingEventIds;
    let ownerId;
    beforeAll(async () => {
      try {
        const ownerUser = await User.findOne({
          where: {
            email: 'cucumber@hogwarts.com',
          },
        });
        ownerId = ownerUser.id;
        const fileName = 'EventsTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        const allEvents = await EventReportPilot.findAll();
        preExistingEventIds = allEvents.map((event) => event.id);
        await importSmartSheetEvent(fileName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`Unable to setup Import Plan Goals test ${error}`);
      }
    });

    afterAll(async () => {
      // clean up events.
      await EventReportPilot.destroy({
        where: {
          id: {
            [Op.notIn]: preExistingEventIds,
          },
        },
      });
    });
    it('should import good events', async () => {
      downloadFile.mockResolvedValue({ Body: readFileSync('EventsTest.csv') });
      let smartSheetEvents = {};
      const { Body: csv } = await downloadFile('EventsTest.csv');

      [...smartSheetEvents] = parse(csv, {
        skipEmptyLines: true,
        columns: true,
      });
      console.log('\n\n\n\n-----File: ', smartSheetEvents);
      expect(smartSheetEvents.length).toBe(4);
      const createdEvents = await EventReportPilot.findAll({
        where: {
          id: {
            [Op.notIn]: preExistingEventIds || [],
          },
        },
      });

      // Assert created count.
      expect(createdEvents[0].data).toEqual({
        'Sheet Name': 'PD23-24 b. Region 01 PD Plan WITH NCs',
        'Event ID': 'R01-PD-23-1035',
        'Full Event Title': 'R01 Reaching More Children and Families',
        'Edit Title': 'Reaching More Children and Families',
        'Event Organizer - Type of Event': 'Regional PD Event (with National Centers)',
        Audience: 'Recipients',
        'Event Duration/# NC Days of Support': 'Series',
        'Reason for Activity': 'Full Enrollment',
        'Target Population(s)': 'Children/Families affected by traumatic events (select the other reasons for child welfare, disaster, substance use or homelessness)',
        'Overall Vision/Goal for the PD Event': 'Participants will explore strategies to reach full enrollment including areas of reaching families in greatest need (homelessness/foster care), right sizing-right programming and developing selection criteria',
        Creator: 'cucumber@hogwarts.com',
      });

      expect(createdEvents.length).toBe(2);

      // Assert event 1.
      expect(createdEvents[0].ownerId).toEqual(ownerId);
      expect(createdEvents[0].regionId).toEqual(1);

      // Assert event 2.
      expect(createdEvents[1].ownerId).toEqual(ownerId);
      expect(createdEvents[1].regionId).toEqual(3);
      expect(createdEvents[1].data).toEqual({
        'Sheet Name': 'PD23-24 b. Region 01 PD Plan WITH NCs',
        'Event ID': 'R03-PD-23-1037',
        'Full Event Title': 'R03 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
        'Edit Title': 'Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
        'Event Organizer - Type of Event': 'Regional PD Event (with National Centers)',
        Audience: 'Recipients',
        'Event Duration/# NC Days of Support': 'Series',
        'Reason for Activity': 'Ongoing Quality Improvement',
        'Target Population(s)': 'None',
        'Overall Vision/Goal for the PD Event': 'Oral Health',
        Creator: 'cucumber@hogwarts.com',
      });

      // Skip unknown owner.
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creator Not Found: \'missing@missing.com\''),
      );

      // Skip duplicate event.
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Event ID: \'R01-PD-23-1035\' already exists'),
      );
    });
  });
});
