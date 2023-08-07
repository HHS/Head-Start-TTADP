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

describe('Import Smart Sheet Events', () => {
  let user;
  beforeEach(async () => {
  });
  afterAll(async () => {
    downloadFile.mockReset();
    await db.sequelize.close();
  });

  describe('imports events correctly', () => {
    let ownerId;
    let createdEventIds;
    beforeAll(async () => {
      try {
        user = await User.create({
          id: faker.datatype.number(),
          homeRegionId: 1,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          email: 'smartsheetevents@ss.com',
          lastLogin: new Date(),
        });
        ownerId = user.id;
        const fileName = 'EventsTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        const createdEvents = await importSmartSheetEvent(fileName);
        createdEventIds = createdEvents.map((event) => event.id);
      } catch (error) {
        // eslint-disable-next-line no-console
        logger.info(`Unable to setup Import Plan Events test ${error}`);
      }
    });

    afterAll(async () => {
      // clean up events.
      await EventReportPilot.destroy({
        where: {
          id: createdEventIds,
        },
      });

      // Clean up user.
      await User.destroy({
        where: {
          id: user.id,
        },
      });
    });
    it('should import and transform good events', async () => {
      const createdEvents = await EventReportPilot.findAll({
        where: {
          id: {
            [Op.in]: createdEventIds,
          },
        },
        order: [['regionId', 'ASC']],
      });
      expect(createdEvents[0].ownerId).toEqual(ownerId);
      expect(createdEvents.length).toBe(2);

      // Assert event 1.
      expect(createdEvents[0].ownerId).toEqual(ownerId);
      expect(createdEvents[0].regionId).toEqual(1);
      expect(createdEvents[0].data).toEqual({
        'Sheet Name': 'PD23-24 b. Region 01 PD Plan WITH NCs',
        eventId: 'R01-PD-23-1035',
        'Full Event Title': 'R01 Reaching More Children and Families',
        eventName: 'Reaching More Children and Families',
        eventOrganizer: 'Regional PD Event (with National Centers)',
        eventIntendedAudience: 'Recipients',
        trainingType: 'Series',
        reasons: ['Full Enrollment', 'Change in Scope'],
        targetPopulations: [
          'Children/Families affected by traumatic events (select the other reasons for child welfare, disaster, substance use or homelessness)',
          'Pregnant Women',
        ],
        vision: 'Participants will explore strategies to reach full enrollment including areas of reaching families in greatest need (homelessness/foster care), right sizing-right programming and developing selection criteria',
        creator: 'smartsheetevents@ss.com',
      });

      // Assert event 2.
      expect(createdEvents[1].ownerId).toEqual(ownerId);
      expect(createdEvents[1].regionId).toEqual(3);
      expect(createdEvents[1].data).toEqual({
        'Sheet Name': 'PD23-24 b. Region 01 PD Plan WITH NCs',
        eventId: 'R03-PD-23-1037',
        'Full Event Title': 'R03 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
        eventName: 'Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
        eventOrganizer: 'Regional PD Event (with National Centers)',
        eventIntendedAudience: 'Recipients',
        trainingType: 'Series',
        reasons: ['Ongoing Quality Improvement'],
        targetPopulations: ['None'],
        vision: 'Oral Health',
        creator: 'smartsheetevents@ss.com',
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
