/* eslint-disable no-console */
import { readFileSync } from 'fs';
import faker from '@faker-js/faker';
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
  let user;
  beforeEach(async () => {
  });
  afterAll(async () => {
    downloadFile.mockReset();
    await db.sequelize.close();
  });

  describe('imports events correctly', () => {
    let preExistingEventIds;
    let ownerId;
    beforeAll(async () => {
      try {
        user = await User.create({
          id: faker.datatype.number(),
          homeRegionId: 1,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          email: 'smartsheetevents@ss.com',
        });
        ownerId = user.id;
        const fileName = 'EventsTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        const allEvents = await EventReportPilot.findAll();
        preExistingEventIds = allEvents.map((event) => event.id);
        await importSmartSheetEvent(fileName);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.info(`Unable to setup Import Plan Events test ${error}`);
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

      // Clean up user.
      await User.destroy({
        where: {
          id: user.id,
        },
      });
    });
    it('should import good events', async () => {
      const createdEvents = await EventReportPilot.findAll({
        where: {
          id: {
            [Op.notIn]: preExistingEventIds || [],
          },
        },
      });
      expect(createdEvents[0].ownerId).toEqual(ownerId);
      expect(createdEvents.length).toBe(2);

      // Assert event 1.
      expect(createdEvents[0].ownerId).toEqual(ownerId);
      expect(createdEvents[0].regionId).toEqual(1);
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
        Creator: 'smartsheetevents@ss.com',
      });

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
        Creator: 'smartsheetevents@ss.com',
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
