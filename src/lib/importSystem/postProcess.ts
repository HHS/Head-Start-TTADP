import db from '../../models';
import { auditLogger } from '../../logger';
import createMonitoringGoals from '../../tools/createMonitoringGoals';

/**
 * Determines what post processing actions need to be executed.
 * This uses the object set on the import.postProcessingActions field.
 * */
const handlePostProcessing = async (id) => {
  try {
    // Get the import for the import id.
    const importRecord = await db.Import.findOne({
      where: {
        id,
      },
    });

    // Loop and execute post processing actions.
    await Promise.all(importRecord.postProcessingActions.map(async (action) => {
      switch (action.function) {
        case 'createMonitoringGoals':
          // Create monitoring goals for the import.
          auditLogger.info(`Starting Post Processing: Creating monitoring goals for import: ${id} - ${importRecord.name} task: ${action.name}`);
          await createMonitoringGoals();
          auditLogger.info(`Finished Post Processing: Creating monitoring goals for import: ${id} - ${importRecord.name} task: ${action.name}`);
          break;
          // Add more post processing cases here...
        default:
          // If we don't find a match, log it and skip.
          auditLogger.error(`Unknown import post processing action: ${action.function} for import: ${id} - ${importRecord.name} skipping`);
          break;
      }
    }));
  } catch (err) {
    auditLogger.error(`Error in Import - handlePostProcessing: ${err.message}`, err);
  }
};

export default handlePostProcessing;
