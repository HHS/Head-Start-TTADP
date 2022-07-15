import { sequelize } from '../models';

export default async function dbMaintenance() {
  await sequelize.query('VACUUM FULL;');
  await sequelize.query('REINDEX DATABASE;');
}
