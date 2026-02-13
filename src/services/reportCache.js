import { processActivityReportObjectiveForResourcesById } from './resource'
import { auditLogger } from '../logger'

const { Op } = require('sequelize')
const {
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveCourse,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCitation,
  Goal,
  GoalFieldResponse,
  GoalTemplateFieldPrompt,
  Objective,
  sequelize,
  Topic,
} = require('../models')

const cacheFiles = async (objectiveId, activityReportObjectiveId, files = []) => {
  const fileIds = files.map((file) => file.id)
  const filesSet = new Set(fileIds)
  const originalAROFiles = await ActivityReportObjectiveFile.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  })
  const originalFileIds = originalAROFiles.map((originalAROFile) => originalAROFile.fileId)
  const removedFileIds = originalFileIds.filter((fileId) => !filesSet.has(fileId))
  const currentFileIds = new Set(originalFileIds.filter((fileId) => filesSet.has(fileId)))
  const newFilesIds = fileIds.filter((topic) => !currentFileIds.has(topic))

  return Promise.all([
    ...newFilesIds.map(async (fileId) =>
      ActivityReportObjectiveFile.create({
        activityReportObjectiveId,
        fileId,
      })
    ),
    removedFileIds.length > 0
      ? ActivityReportObjectiveFile.destroy({
          where: {
            activityReportObjectiveId,
            fileId: { [Op.in]: removedFileIds },
          },
          individualHooks: true,
          hookMetadata: { objectiveId },
        })
      : Promise.resolve(),
  ])
}

const cacheResources = async (_objectiveId, activityReportObjectiveId, resources = []) => {
  // Get resource urls.
  const resourceUrls = resources
    .map((r) => {
      if (r.resource && r.resource.url) return r.resource.url
      if (r.url) return r.url
      if (r.value) return r.value
      return null
    })
    .filter((url) => url)

  const resourceIds = resources
    .map((r) => {
      if (r.resource?.id) return r.resource.id
      if (r.resourceId) return r.resourceId
      return null
    })
    .filter((id) => id)

  return processActivityReportObjectiveForResourcesById(activityReportObjectiveId, resourceUrls, resourceIds)
}

export const cacheCourses = async (objectiveId, activityReportObjectiveId, courses = []) => {
  const courseIds = courses.map((course) => course.id)
  const courseSet = new Set(courseIds)
  const originalAroCourses = await ActivityReportObjectiveCourse.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  })
  const originalCourseIds = originalAroCourses.map((course) => course.courseId) || []
  const removedCourseIds = originalCourseIds.filter((id) => !courseSet.has(id))
  const currentCourseIds = new Set(originalCourseIds.filter((id) => courseSet.has(id)))
  const newCourseIds = courseIds.filter((id) => !currentCourseIds.has(id))

  return Promise.all([
    ...newCourseIds.map(async (courseId) =>
      ActivityReportObjectiveCourse.create({
        activityReportObjectiveId,
        courseId,
      })
    ),
    removedCourseIds.length > 0
      ? ActivityReportObjectiveCourse.destroy({
          where: {
            activityReportObjectiveId,
            courseId: { [Op.in]: removedCourseIds },
          },
          individualHooks: true,
          hookMetadata: { objectiveId },
        })
      : Promise.resolve(),
  ])
}

const cacheTopics = async (objectiveId, activityReportObjectiveId, topics = []) => {
  // Find all topics with missing ids
  const topicsNeedingLookup = topics.filter((t) => !t.id && t.name)
  let resolvedTopics = []
  if (topicsNeedingLookup.length > 0) {
    auditLogger.info(
      'Some topics were missing IDs and required a lookup. ' +
        `ObjectiveId: ${objectiveId}, AROId: ${activityReportObjectiveId}, ` +
        `Raw topics: ${JSON.stringify(topicsNeedingLookup)}`
    )
    const topicNames = topicsNeedingLookup.map((t) => t.name)
    const foundTopics = await Topic.findAll({
      where: { name: topicNames },
    })

    // Log any that weren't found
    const foundNames = new Set(foundTopics.map((t) => t.name))
    const missing = topicNames.filter((n) => !foundNames.has(n))
    if (missing.length) {
      auditLogger.error(`Could not resolve topic names: ${missing.join(', ')} for objectiveId: ${objectiveId}`)
    }

    resolvedTopics = foundTopics.map((t) => ({ id: t.id, name: t.name }))
  }

  const enrichedTopics = topics
    .map((t) => {
      if (t.id) return t
      const resolved = resolvedTopics.find((rt) => rt.name === t.name)
      return resolved ? { ...t, id: resolved.id } : null
    })
    .filter(Boolean)

  const topicIds = enrichedTopics.map((t) => t.id)

  const topicsSet = new Set(topicIds)
  const originalAROTopics = await ActivityReportObjectiveTopic.findAll({
    where: { activityReportObjectiveId },
  })
  const originalTopicIds = originalAROTopics.map((t) => t.topicId)

  const removedTopicIds = originalTopicIds.filter((id) => !topicsSet.has(id))
  const currentTopicIds = new Set(originalTopicIds.filter((id) => topicsSet.has(id)))
  const newTopicIds = topicIds.filter((id) => !currentTopicIds.has(id))

  return Promise.all([
    ...newTopicIds.map((topicId) =>
      ActivityReportObjectiveTopic.create({
        activityReportObjectiveId,
        topicId,
      })
    ),
    removedTopicIds.length > 0
      ? ActivityReportObjectiveTopic.destroy({
          where: {
            activityReportObjectiveId,
            topicId: { [Op.in]: removedTopicIds },
          },
          individualHooks: true,
          hookMetadata: { objectiveId },
        })
      : Promise.resolve(),
  ])
}

/*
  - ActivityReportObjectiveCitation -
  Each row in this table is per grant (from ARO).
  Each row has a json column called 'monitoringReferences', this is an array of objects.
  Each object is unique by a combination of grantId, findingId, and reviewName (for the same grant).
  To avoid complex lookups, we will simply UPDATE (by id) existing and CREATE new citations.
  Citations to remove will be determined by id.
*/
export const cacheCitations = async (objectiveId, activityReportObjectiveId, citations = []) => {
  let newCitations = []
  // Delete all existing citations for this activity report objective.
  await ActivityReportObjectiveCitation.destroy({
    where: { activityReportObjectiveId },
    individualHooks: true,
    hookMetadata: { objectiveId },
  })

  // Get the goal for this objective.
  const goal = await Goal.findOne({
    attributes: ['grantId', 'createdVia'],
    include: [
      {
        model: Objective,
        as: 'objectives',
        where: { id: objectiveId },
        required: true,
      },
    ],
  })

  if (!goal) {
    auditLogger.info(`No goal found for objective ${objectiveId}. Skipping citation caching.`)
    return []
  }

  if (goal.createdVia !== 'monitoring') {
    // If this is no longer a monitoring goal associated with this objective,
    // we don't (and shouldn't) save any citations.
    return []
  }

  // Create citations to save.
  if (citations && citations.length > 0) {
    // Get the grant id from the goal.
    const grantForThisCitation = goal.grantId
    // Get all the citations for the grant.
    const citationsToSave = citations.reduce((acc, citation) => {
      const { monitoringReferences } = citation
      monitoringReferences.forEach((ref) => {
        const { grantId } = ref
        if (grantId === grantForThisCitation && !acc.find((c) => c.standardId === ref.standardId)) {
          acc.push(citation)
        }
      })
      return acc
    }, [])
    newCitations = citationsToSave.map((citation) => ({
      activityReportObjectiveId,
      citation: citation.citation,
      // Only save the monitoring references for the grant we are working with.
      monitoringReferences: citation.monitoringReferences.filter((ref) => ref.grantId === grantForThisCitation),
    }))
    // If we have citations to save, create them.
    if (newCitations.length > 0) {
      return ActivityReportObjectiveCitation.bulkCreate(newCitations, { individualHooks: true })
    }
  }
  return newCitations
}

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files,
    resources,
    topics,
    citations,
    ttaProvided,
    status,
    courses,
    order,
    supportType,
    closeSuspendContext,
    closeSuspendReason,
    objectiveCreatedHere,
    useIpdCourses,
    useFiles,
  } = metadata

  const objectiveId = objective.dataValues ? objective.dataValues.id : objective.id
  let aro = await ActivityReportObjective.findOne({
    where: {
      objectiveId,
      activityReportId: reportId,
    },
    raw: true,
  })
  if (!aro) {
    aro = await ActivityReportObjective.create(
      {
        objectiveId,
        activityReportId: reportId,
      },
      { raw: true }
    )
  }
  const { id: activityReportObjectiveId } = aro
  // Updates take longer then selects to settle in the db, as a result this update needs to be
  // complete prior to calling cacheResources to prevent stale data from being returned. This
  // means the following update cannot be in the Promise.all in the return.
  await ActivityReportObjective.update(
    {
      title: objective.title,
      status: status || objective.status,
      ttaProvided,
      supportType: supportType || null,
      arOrder: order + 1,
      closeSuspendContext: closeSuspendContext || null,
      closeSuspendReason: closeSuspendReason || null,
      objectiveCreatedHere,
      useIpdCourses,
      useFiles,
    },
    {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }
  )

  return Promise.all([
    Objective.update(
      { onAR: true },
      {
        where: { id: objectiveId },
        individualHooks: true,
      }
    ),
    cacheFiles(objectiveId, activityReportObjectiveId, files),
    cacheResources(objectiveId, activityReportObjectiveId, resources),
    cacheTopics(objectiveId, activityReportObjectiveId, topics),
    cacheCourses(objectiveId, activityReportObjectiveId, courses),
    cacheCitations(objectiveId, activityReportObjectiveId, citations),
  ])
}

export const cachePrompts = async (goalId, activityReportGoalId, promptResponses) => {
  const originalARGResponses = await ActivityReportGoalFieldResponse.findAll({
    attributes: ['id', 'goalTemplateFieldPromptId', 'response'],
    where: { activityReportGoalId },
    raw: true,
  })

  const { newPromptResponses, updatedPromptResponses, promptIds } = promptResponses
    // first we transform to match the correct column names
    .map(({ response, promptId }) => ({ response, goalTemplateFieldPromptId: promptId }))
    // then we reduce, separating the new and updated records
    .reduce(
      (acc, promptResponse) => {
        const currentPromptResponse = originalARGResponses.find(
          ({ goalTemplateFieldPromptId }) => promptResponse.goalTemplateFieldPromptId === goalTemplateFieldPromptId
        )

        if (!currentPromptResponse) {
          // Record is in newData but not in currentData
          acc.newPromptResponses.push(promptResponse)
        } else if (
          // we check to see if the old response the new
          JSON.stringify(promptResponse.response) !== JSON.stringify(currentPromptResponse.response)
        ) {
          // Record is in both newData and currentData, but with different responses
          acc.updatedPromptResponses.push(promptResponse)
        }

        acc.promptIds.push(promptResponse.goalTemplateFieldPromptId)

        return acc
      },
      { newPromptResponses: [], updatedPromptResponses: [], promptIds: [] }
    )

  // Find records in currentData but not in newData
  const removedPromptResponses = originalARGResponses.filter(({ goalTemplateFieldPromptId }) => !promptIds.includes(goalTemplateFieldPromptId))

  return Promise.all([
    ...newPromptResponses.map(async ({ goalTemplateFieldPromptId, response }) =>
      ActivityReportGoalFieldResponse.create({
        activityReportGoalId,
        goalTemplateFieldPromptId,
        response,
      })
    ),
    ...updatedPromptResponses.map(async ({ goalTemplateFieldPromptId, response }) =>
      ActivityReportGoalFieldResponse.update(
        { response },
        {
          where: {
            activityReportGoalId,
            goalTemplateFieldPromptId,
          },
        }
      )
    ),
    removedPromptResponses.length > 0
      ? ActivityReportGoalFieldResponse.destroy({
          where: {
            id: removedPromptResponses.map(({ id }) => id),
          },
          individualHooks: true,
          hookMetadata: { goalId },
        })
      : Promise.resolve(),
  ])
}

const cacheGoalMetadata = async (goal, reportId, isActivelyBeingEditing, prompts) => {
  // first we check to see if the activity report -> goal link already exists
  let arg = await ActivityReportGoal.findOne({
    where: {
      goalId: goal.id,
      activityReportId: reportId,
    },
  })

  // if it does, then we update it with the new values
  if (arg) {
    const activityReportGoalId = arg.id
    await ActivityReportGoal.update(
      {
        name: goal.name,
        status: goal.status,
        timeframe: goal.timeframe,
        closeSuspendReason: goal.closeSuspendReason,
        closeSuspendContext: goal.closeSuspendContext,
        isRttapa: null,
        isActivelyEdited: isActivelyBeingEditing || false,
        source: goal.source,
      },
      {
        where: { id: activityReportGoalId },
        individualHooks: true,
      }
    )
  } else {
    // otherwise, we create a new one
    arg = await ActivityReportGoal.create(
      {
        goalId: goal.id,
        activityReportId: reportId,
        name: goal.name,
        status: goal.status,
        timeframe: goal.timeframe,
        closeSuspendReason: goal.closeSuspendReason,
        closeSuspendContext: goal.closeSuspendContext,
        source: goal.source,
        isRttapa: null,
        isActivelyEdited: isActivelyBeingEditing || false,
      },
      {
        individualHooks: true,
        returning: true,
        plain: true,
      }
    )
  }

  const finalPromises = [Goal.update({ onAR: true }, { where: { id: goal.id }, individualHooks: true })]

  // Save the prompts for the ARG.
  if (!prompts || !prompts.length) {
    // If no prompts are passed in get them from the goal.
    const goalPrompts = await GoalFieldResponse.findAll({
      attributes: [['goalTemplateFieldPromptId', 'promptId'], [sequelize.col('prompt."title"'), 'title'], 'response'],
      where: { goalId: goal.id },
      raw: true,
      include: [
        {
          model: GoalTemplateFieldPrompt,
          as: 'prompt',
          required: true,
          attributes: [],
          where: {
            title: 'FEI root cause',
          },
        },
      ],
    })

    // if we have goal prompts call cache prompts with the goals prompts
    if (goalPrompts && goalPrompts.length) {
      finalPromises.push(cachePrompts(goal.id, arg.id, goalPrompts))
    }
  } else if (prompts.length) {
    finalPromises.push(cachePrompts(goal.id, arg.id, prompts))
  }
  return Promise.all(finalPromises)
}

async function destroyActivityReportObjectiveMetadata(activityReportObjectiveIdsToRemove, objectiveIds) {
  return Array.isArray(activityReportObjectiveIdsToRemove) && activityReportObjectiveIdsToRemove.length > 0
    ? Promise.all([
        ActivityReportObjectiveFile.destroy({
          where: {
            activityReportObjectiveId: activityReportObjectiveIdsToRemove,
          },
          hookMetadata: { objectiveIds },
          individualHooks: true,
        }),
        ActivityReportObjectiveResource.destroy({
          where: {
            activityReportObjectiveId: activityReportObjectiveIdsToRemove,
          },
          hookMetadata: { objectiveIds },
          individualHooks: true,
        }),
        ActivityReportObjectiveTopic.destroy({
          where: {
            activityReportObjectiveId: activityReportObjectiveIdsToRemove,
          },
          hookMetadata: { objectiveIds },
          individualHooks: true,
        }),
      ])
    : Promise.resolve()
}

export { cacheFiles, cacheResources, cacheTopics, cacheObjectiveMetadata, cacheGoalMetadata, destroyActivityReportObjectiveMetadata }
