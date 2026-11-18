const { Op } = require('sequelize');

const cleanupOrphanResources = async (sequelize, resourceId) =>
  Promise.all([
    sequelize.models.Resource.destroy({
      where: {
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT DISTINCT
               r.id
            FROM "Resources" r
            LEFT JOIN "ActivityReportResources" arr
            ON r.id = arr."resourceId"
            LEFT JOIN "ActivityReportGoalResources" argr
            ON r.id = argr."resourceId"
            LEFT JOIN "ActivityReportObjectiveResources" aror
            ON r.id = aror."resourceId"
            LEFT JOIN "GoalResources" gr
            ON r.id = gr."resourceId"
            LEFT JOIN "GoalTemplateResources" gtr
            ON r.id = gtr."resourceId"
            LEFT JOIN "NextStepResources" nsr
            ON r.id = nsr."resourceId"
            WHERE r.id = ${resourceId}
            AND arr.id IS NULL
            AND argr.id IS NULL
            AND aror.id IS NULL
            AND gr.id IS NULL
            AND gtr.id IS NULL
            AND nsr.id IS NULL
            GROUP BY 1
         )`),
        },
      },
    }),
  ]);
export { cleanupOrphanResources };
