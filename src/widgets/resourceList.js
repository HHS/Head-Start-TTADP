import { Op } from 'sequelize';
import { ActivityReport, ActivityReportObjective, ActivityReportObjectiveResource } from '../models';
import { REPORT_STATUSES } from '../constants';

export default async function resourceList(scopes) {
  // Query Database for all Resources within the scope.
  const res = await ActivityReport.findAll({
    attributes: [
      'id',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        include: [
          {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            required: false,
          },
        ],
      },

    ],
    raw: true,
  });

  const resourceCounts = res.reduce(
    (resources, resource) => {
      const name = resource['activityReportObjectives.activityReportObjectiveResources.userProvidedUrl'] || 'none';
      const exists = resources.find((o) => o.name === name);
      if (exists) {
        exists.count += 1;
        return resources;
      }

      return [...resources, { name, count: 1 }];
    },
    [],
  );

  // Sort By Count largest to smallest.
  resourceCounts.sort((r1, r2) => {
    if (r2.count - r1.count === 0) {
      // Break tie on name
      const name1 = r1.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      const name2 = r2.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      if (name1 < name2) {
        return -1;
      }
      if (name1 > name2) {
        return 1;
      }
    }
    return r2.count - r1.count;
  });

  return resourceCounts;
}
