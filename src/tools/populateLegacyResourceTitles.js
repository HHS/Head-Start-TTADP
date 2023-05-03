/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import {
  Resource,
} from '../models';
import { addGetResourceMetadataToQueue } from '../services/resourceQueue';
import { auditLogger, logger } from '../logger';

export default async function processLegacyResources() {
  try {
    logger.info('Populate Legacy Resources: Starting...');
    // Get all resources that have no title set.
    const resources = await Resource.findAll({
      where: {
        title: null,
      },
    });
    logger.info(`Populate Legacy Resources: Found ${resources.length} resources`);

    // Loop and queue resources for processing.
    for (const resource of resources) {
      addGetResourceMetadataToQueue(resource.id, resource.url);
    }
    logger.info(`Populate Legacy Resources: ...Finished adding of ${resources.length} resources for metadata processing`);
  } catch (err) {
    // eslint-disable-next-line no-console
    auditLogger.error(`Populate Legacy Resources Error: ${err}`);
  }
}
