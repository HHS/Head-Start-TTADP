import { QueryTypes } from 'sequelize';
import config from '../../config/config';
import { sequelize } from '../models';
import { auditLogger } from '../logger';

const env = process.env.NODE_ENV || 'development';
const dbName = config[env].database;

export default async function dbMaintenance() {
  try {
    await sequelize.query('VACUUM FULL;', {
      type: QueryTypes.RAW,
      raw: true,
      rawErrors: true,
      logging: auditLogger.error,
    });
    await sequelize.query(`REINDEX DATABASE ${dbName};`, {
      type: QueryTypes.RAW,
      raw: true,
      rawErrors: true,
      logging: auditLogger.error,
    });
  } catch (err) {
    auditLogger.error(JSON.stringify(err));
  }
}
