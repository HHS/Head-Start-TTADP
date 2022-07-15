import { QueryTypes } from 'sequelize';
import config from '../../config/config';
import { sequelize } from '../models';

const env = process.env.NODE_ENV || 'development';
const dbName = config[env].database;

export default async function dbMaintenance() {
  await sequelize.query('VACUUM FULL;', { type: QueryTypes.RAW });
  await sequelize.query(`REINDEX DATABASE ${dbName};`, { type: QueryTypes.RAW });
}
