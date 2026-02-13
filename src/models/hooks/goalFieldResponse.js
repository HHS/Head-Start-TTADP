import { Op } from 'sequelize'

const autoPopulateOnAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onAR === undefined || instance.onAR === null) {
    instance.set('onAR', false)
    if (!options.fields.includes('onAR')) {
      options.fields.push('onAR')
    }
  }
}

const autoPopulateOnApprovedAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onApprovedAR === undefined || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false)
    if (!options.fields.includes('onApprovedAR')) {
      options.fields.push('onApprovedAR')
    }
  }
}

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = [] //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options)
  autoPopulateOnApprovedAR(sequelize, instance, options)
}

const syncActivityReportGoalFieldResponses = async (sequelize, instance, _options) => {
  const changed = instance.changed()
  if (instance.id !== null && Array.isArray(changed) && changed.includes('response')) {
    // Update all ActivityReportGoalFieldResponses with this goalId and promptId.
    const { goalId, goalTemplateFieldPromptId } = instance

    const activityReportGoals = await sequelize.models.ActivityReportGoal.findAll({
      attributes: ['id', 'activityReportId'],
      where: {
        goalId,
      },
      include: [
        {
          required: true,
          attributes: ['id', 'calculatedStatus'],
          model: sequelize.models.ActivityReport,
          as: 'activityReport',
          where: {
            calculatedStatus: {
              [Op.ne]: 'approved', // Only update ActivityReportGoalFieldResponses on unapproved ARs.
            },
          },
        },
      ],
    })

    const activityReportIds = [...new Set(activityReportGoals.map((item) => item.activityReportId))]
    const activityReportGoalIds = [...new Set(activityReportGoals.map((item) => item.id))]

    // Perform the update.
    const updatedResponses = await sequelize.models.ActivityReportGoalFieldResponse.update(
      { response: instance.response },
      {
        where: {
          activityReportGoalId: activityReportGoalIds,
          goalTemplateFieldPromptId,
        },
        returning: true,
      }
    )

    // Get all the ActivityReportGoal ids that were updated.
    const updatedResponseIds = [...new Set(updatedResponses[1].map((item) => item.activityReportGoalId))]

    // If the activityReportGoal exists but wasn't updated we know its missing a response.
    const argsToCreate = activityReportGoalIds.filter((id) => !updatedResponseIds.includes(id))

    // Create the missing ActivityReportGoalFieldResponses.
    await Promise.all(
      argsToCreate.map(async (argId) => {
        await sequelize.models.ActivityReportGoalFieldResponse.create({
          goalTemplateFieldPromptId,
          activityReportGoalId: argId,
          response: instance.response,
        })
      })
    )

    // We need to update the AR createdAt so we don't pull from outdated local storage.
    if (activityReportIds.length > 0) {
      await sequelize.query(`UPDATE "ActivityReports" SET "updatedAt" = '${new Date().toISOString()}' WHERE id IN (${activityReportIds.join(',')})`)
    }
  }
}

const afterUpdate = async (sequelize, instance, options) => {
  await syncActivityReportGoalFieldResponses(sequelize, instance, options)
}

const afterCreate = async (sequelize, instance, options) => {
  await syncActivityReportGoalFieldResponses(sequelize, instance, options)
}

export { autoPopulateOnAR, autoPopulateOnApprovedAR, beforeValidate, afterUpdate, afterCreate }
