import { auditLogger } from '../logger';
import { sequelize } from '../models';
import deleteOldRecords from './dbMaintenance';

if (require.main === module) {
  deleteOldRecords()
    .then(() => sequelize.close())
    .then(() => {
      process.exit(process.exitCode || 0);
    })
    .catch((error) => {
      auditLogger.error(`Error running db maintenance: ${error.message}`);
      sequelize.close().finally(() => {
        process.exit(1);
      });
    });
}

export default deleteOldRecords;
