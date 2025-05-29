/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { sequelize } from '../models';

const queryMonitoringData = async () => {
  console.info('Getting recent monitoring updates');
  const result = await sequelize.query(
    `-- The prepends either 'New Goals: ' or 'New CLASS: ' to
    -- the recipients column so that minimal changes are needed in
    -- the CircleCI config.yml

    -- Find all new monitoring Goals created in the last 12 hours
    WITH newgoals AS (
    SELECT
      LEFT(r.name,35) recipname,
      "regionId" region,
      COUNT(*) cnt
    FROM "Goals" g
    JOIN "Grants" gr ON g."grantId" = gr.id
    JOIN "Recipients" r ON gr."recipientId" = r.id
    WHERE "createdVia" = 'monitoring'
      AND g."createdAt" > (NOW() - INTERVAL '12 hours')
    GROUP BY 1,2
    ),
    -- find what the 'Complete' statusId is so that we can look
    -- for the change in the audit logs without as many joins
    completestatus AS (
    SELECT DISTINCT ON (name) "statusId" completestatus
    FROM "MonitoringReviewStatuses"
    WHERE name = 'Complete'
    ORDER BY name,1
    ),
    -- find newly completed CLASS reviews. Because we're looking
    -- at dml_timestamp rather than dates and times internal to the
    -- data, this will find "new" CLASS back to the last time we
    -- imported fresh monitoring data
    freshclassreviews AS (
    SELECT DISTINCT mr."reviewId" revid
    FROM "MonitoringReviews" mr
    JOIN completestatus cs
      ON mr."statusId" = completestatus
    JOIN "ZALMonitoringReviews" zmr
      ON mr.id = zmr.data_id
      AND dml_timestamp > (NOW() - INTERVAL '12 hours')
      AND new_row_data->>'statusId' = completestatus::text
      AND old_row_data->>'statusId' != completestatus::text
    WHERE mr."reviewType" = 'CLASS'
      AND mr."reportDeliveryDate" IS NOT NULL
    ),
    -- put the recipients of new CLASS reports in the same format
    newclass AS (
    SELECT
      LEFT(r.name,35) recipname,
      "regionId" region,
      COUNT(*) cnt
    FROM freshclassreviews
    JOIN "MonitoringReviewGrantees" mrg ON mrg."reviewId" = revid
    JOIN "Grants" gr ON gr.number = mrg."grantNumber"
    JOIN "Recipients" r ON gr."recipientId" = r.id
    GROUP BY 1,2
    )
    -- UNION and prepend the sources
    SELECT
      'New Goals: ' || recipname recipient,
      region,
      cnt
    FROM newgoals
    UNION
    SELECT
      'New CLASS: ' || recipname recipient,
      region,
      cnt
    FROM newclass
    ORDER BY 2,1;`,
    { raw: true },
  );
  console.info(`Recent Monitoring Updates: ${JSON.stringify(result[0])}`);
};

export default queryMonitoringData;
