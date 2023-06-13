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

async function parseCsv(fileKey) {
  const { Body: csv } = await downloadFile(fileKey);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

export default async function importSmartSheetEvent(fileKey) {
  const smartSheetEvents = await parseCsv(fileKey);

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
              `(SELECT id FROM "EventReportPilots" WHERE data->>'Event ID' = '${eventId}')`,
            ),
          },
        },
      });

      if (existingEventReportPilot) {
        logger.info(`Event ID: '${eventId}' already exists in EventReportPilot table. Skipping...`);
        // eslint-disable-next-line no-continue
        continue;
      } else {
        await EventReportPilot.create({
          collaboratorIds: [],
          ownerId,
          regionId,
          data: sequelize.cast(JSON.stringify(smartSheetEvent), 'jsonb'),
        });
      }
    }
    logger.info(`<<< Success! Finished processing of ${smartSheetEvents.length} SmartSheet Events`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
