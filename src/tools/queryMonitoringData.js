/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { sequelize } from '../models';

const queryMonitoringData = async () => {
  console.info('Getting recent monitoring goals');
  const result = await sequelize.query(
    `SELECT LEFT(r.name,35) recipient, "regionId" region,
      COUNT(*) cnt FROM "Goals" g
      JOIN "Grants" gr ON g."grantId" = gr.id
      JOIN "Recipients" r ON gr."recipientId" = r.id
      WHERE "createdVia" = 'monitoring'
      AND g."createdAt" > (NOW() - INTERVAL '24 hours')
      GROUP BY 1,2 ORDER BY 2,1;`,
    { raw: true },
  );
  console.info(`Recent Monitoring Goals: ${JSON.stringify(result)[0]}`);
};

export default queryMonitoringData;
