/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { Op } from 'sequelize';
import { downloadFile } from '../lib/s3';
import {
  sequelize,
  User,
  EventReportPilot,
} from '../models';
import { logger } from '../logger';

// eslint-disable-next-line max-len
const splitArrayTransformer = (value, splitter = '|') => value.split(splitter).map((item) => item.trim());

const transformers = {
  reasons: splitArrayTransformer,
  targetPopulations: splitArrayTransformer,
};

const mappings = {
  Audience: 'audience',
  Creator: 'creator',
  'Edit Title': 'eventName',
  'Event Duration/#NC Days of Support': 'eventDuration',
  'Event ID': 'eventId',
  'Overall Vision/Goal for the PD Event': 'vision',
  'Reason for Activity': 'reasons',
  'Target Population(s)': 'targetPopulations',
  'Event Organizer - Type of Event': 'eventOrganizer',
};

async function parseCsv(fileKey) {
  const { Body: csv } = await downloadFile(fileKey);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

export default async function importSmartSheetEvent(fileKey) {
  const smartSheetEvents = await parseCsv(fileKey);
  const created = [];

  try {
    logger.info(`>>> Starting processing of ${smartSheetEvents.length} SmartSheet Events`);
    for await (const smartSheetEvent of smartSheetEvents) {
      logger.info(`Processing Event ID: ${smartSheetEvent['Event ID']} - Creator: ${smartSheetEvent.Creator}`);

      // Get the region number from the Event ID.
      const eventId = smartSheetEvent['Event ID'];
      let regionId = eventId.split('-')[0];
      // Remove alpha characters.
      regionId = regionId.replace(/\D/g, '');

      // Get user via creator email.
      const creatorEmail = smartSheetEvent.Creator;

      let creator;
      if (creatorEmail) {
        creator = await User.findOne({
          where: {
            email: creatorEmail.toLowerCase(),
          },
        });
      }

      if (!creator) {
        logger.info(`Creator Not Found: '${creatorEmail}' not found in User table. Skipping...`);
        // eslint-disable-next-line no-continue
        continue;
      }
      const ownerId = creator.id;

      // Check for an existing EventReportPilot record.
      const existingEventReportPilot = await EventReportPilot.findOne({
        where: {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT id FROM "EventReportPilots" WHERE data->>'eventId' = '${eventId}')`,
            ),
          },
        },
      });

      if (existingEventReportPilot) {
        logger.info(`Event ID: '${eventId}' already exists in EventReportPilot table. Skipping...`);
        // eslint-disable-next-line no-continue
        continue;
      } else {
        // convert smartSheetEvent to use mappings
        const eventReportPilotData = {};
        Object.keys(smartSheetEvent).forEach((key) => {
          const mappedKey = mappings[key];
          if (mappedKey && transformers[mappedKey]) {
            eventReportPilotData[mappedKey] = transformers[mappedKey](smartSheetEvent[key]);
          } else if (mappedKey) {
            eventReportPilotData[mappedKey] = smartSheetEvent[key];
          } else {
            eventReportPilotData[key] = smartSheetEvent[key];
          }
        });

        created.push(await EventReportPilot.create({
          collaboratorIds: [],
          ownerId,
          regionId,
          data: sequelize.cast(JSON.stringify(eventReportPilotData), 'jsonb'),
          imported: sequelize.cast(JSON.stringify(smartSheetEvent), 'jsonb'),
        }));
      }
    }
    logger.info(`<<< Success! Finished processing of ${smartSheetEvents.length} SmartSheet Events`);
    return created;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return created.length;
  }
}
