import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';

export default async function dbMaintenance() {
  await sequelize.query('VACUUM FULL;', { type: QueryTypes.RAW });
  await sequelize.query('REINDEX DATABASE ttasmarthub;', { type: QueryTypes.RAW });
}
