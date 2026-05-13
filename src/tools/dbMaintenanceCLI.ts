import { auditLogger } from '../logger';
import { sequelize } from '../models';
import deleteOldRecords from './dbMaintenance';

if (require.main === module) {
  deleteOldRecords()
    .then(() => sequelize.close())
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      auditLogger.error(`Error running db maintenance: ${message}`);
      sequelize.close().finally(() => {
        process.exit(1);
      });
    });
}

export default deleteOldRecords;
