/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import {
  Resource,
} from '../models';
import { addGetResourceMetadataToQueue } from '../services/resourceQueue';
import { auditLogger, logger } from '../logger';
import { unparsableMimeTypes } from '../lib/resource';

export default async function processLegacyResources(startDate, endDate) {
  try {
    logger.info(`Populate Legacy Resources (from: ${startDate} to: ${endDate}): Starting...`);
    // Get all resources that have no title set.
    const resources = await Resource.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: {
              title: null,
              [Op.and]: {
                metadata: null,
                domain: 'eclkc.ohs.acf.hhs.gov',
              },
            },
          },
          {
            createdAt: {
              [Op.between]: [new Date(startDate), new Date(endDate)],
            },
          },
          {
            [Op.or]: [
              { mimeType: { [Op.notIn]: unparsableMimeTypes } },
              { mimeType: null },
            ],
          },
          {
            [Op.or]: [
              { lastStatusCode: { [Op.not]: httpCodes.UNAUTHORIZED } },
              { lastStatusCode: null },
            ],
          },
        ],
      },
      raw: true,
    });
    logger.info(`Populate Legacy Resources: Found ${resources.length} resource to process`);
    // Loop and queue resources for processing.
    const x = await Promise.allSettled(resources.map(
      async (resource) => addGetResourceMetadataToQueue(resource.id, resource.url),
    ));
    logger.info(`Populate Legacy Resources: ...Finished adding of ${resources.length} resources for metadata processing`);
  } catch (err) {
    // eslint-disable-next-line no-console
    auditLogger.error(`Populate Legacy Resources Error: ${err}`);
  }
}
