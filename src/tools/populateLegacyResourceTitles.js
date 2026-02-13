/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { Op } from 'sequelize'
import { Resource } from '../models'
import { addGetResourceMetadataToQueue } from '../services/resourceQueue'
import { auditLogger, logger } from '../logger'

export default async function processLegacyResources(startDate, endDate) {
  try {
    logger.info(`Populate Legacy Resources (from: ${startDate} > to: ${endDate}): Starting...`)
    // Get all resources that have no title set.
    const resources = await Resource.findAll({
      where: {
        title: null,
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      },
    })
    logger.info(`Populate Legacy Resources: Found ${resources.length} resource to process`)
    // Loop and queue resources for processing.
    for (const resource of resources) {
      // eslint-disable-next-line no-await-in-loop
      await addGetResourceMetadataToQueue(resource.id, resource.url)
    }
    logger.info(`Populate Legacy Resources: ...Finished adding of ${resources.length} resources for metadata processing`)
  } catch (err) {
    // eslint-disable-next-line no-console
    auditLogger.error(`Populate Legacy Resources Error: ${err}`)
  }
}
