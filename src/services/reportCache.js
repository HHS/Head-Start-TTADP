import { Op } from 'sequelize';
import formatMonitoringCitationName from '../lib/formatMonitoringCitationName';
import { auditLogger } from '../logger';
import {
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveCourse,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  Citation,
  Goal,
  GoalFieldResponse,
  GoalTemplateFieldPrompt,
  Objective,
  sequelize,
  Topic,
} from '../models';
import { processActivityReportObjectiveForResourcesById } from './resource';

const trimToNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = String(value).trim();
  return trimmedValue || null;
};

const cacheFiles = async (objectiveId, activityReportObjectiveId, files = []) => {
  const fileIds = files.map((file) => file.id);
  const filesSet = new Set(fileIds);
  const originalAROFiles = await ActivityReportObjectiveFile.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  });
  const originalFileIds = originalAROFiles.map((originalAROFile) => originalAROFile.fileId);
  const removedFileIds = originalFileIds.filter((fileId) => !filesSet.has(fileId));
  const currentFileIds = new Set(originalFileIds.filter((fileId) => filesSet.has(fileId)));
  const newFilesIds = fileIds.filter((topic) => !currentFileIds.has(topic));

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
  ]);
};

const cacheResources = async (_objectiveId, activityReportObjectiveId, resources = []) => {
  // Get resource urls.
  const resourceUrls = resources
    .map((r) => {
      if (r.resource && r.resource.url) return r.resource.url;
      if (r.url) return r.url;
      if (r.value) return r.value;
      return null;
    })
    .filter((url) => url);

  const resourceIds = resources
    .map((r) => {
      if (r.resource?.id) return r.resource.id;
      if (r.resourceId) return r.resourceId;
      return null;
    })
    .filter((id) => id);

  return processActivityReportObjectiveForResourcesById(
    activityReportObjectiveId,
    resourceUrls,
    resourceIds
  );
};

export const cacheCourses = async (objectiveId, activityReportObjectiveId, courses = []) => {
  const courseIds = courses.map((course) => course.id);
  const courseSet = new Set(courseIds);
  const originalAroCourses = await ActivityReportObjectiveCourse.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  });
  const originalCourseIds = originalAroCourses.map((course) => course.courseId) || [];
  const removedCourseIds = originalCourseIds.filter((id) => !courseSet.has(id));
  const currentCourseIds = new Set(originalCourseIds.filter((id) => courseSet.has(id)));
  const newCourseIds = courseIds.filter((id) => !currentCourseIds.has(id));

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
  ]);
};

const cacheTopics = async (objectiveId, activityReportObjectiveId, topics = []) => {
  // Find all topics with missing ids
  const topicsNeedingLookup = topics.filter((t) => !t.id && t.name);
  let resolvedTopics = [];
  if (topicsNeedingLookup.length > 0) {
    auditLogger.info(
      'Some topics were missing IDs and required a lookup. ' +
        `ObjectiveId: ${objectiveId}, AROId: ${activityReportObjectiveId}, ` +
        `Raw topics: ${JSON.stringify(topicsNeedingLookup)}`
    );
    const topicNames = topicsNeedingLookup.map((t) => t.name);
    const foundTopics = await Topic.findAll({
      where: { name: topicNames },
    });

    // Log any that weren't found
    const foundNames = new Set(foundTopics.map((t) => t.name));
    const missing = topicNames.filter((n) => !foundNames.has(n));
    if (missing.length) {
      auditLogger.error(
        `Could not resolve topic names: ${missing.join(', ')} for objectiveId: ${objectiveId}`
      );
    }

    resolvedTopics = foundTopics.map((t) => ({ id: t.id, name: t.name }));
  }

  const enrichedTopics = topics
    .map((t) => {
      if (t.id) return t;
      const resolved = resolvedTopics.find((rt) => rt.name === t.name);
      return resolved ? { ...t, id: resolved.id } : null;
    })
    .filter(Boolean);

  const topicIds = enrichedTopics.map((t) => t.id);

  const topicsSet = new Set(topicIds);
  const originalAROTopics = await ActivityReportObjectiveTopic.findAll({
    where: { activityReportObjectiveId },
  });
  const originalTopicIds = originalAROTopics.map((t) => t.topicId);

  const removedTopicIds = originalTopicIds.filter((id) => !topicsSet.has(id));
  const currentTopicIds = new Set(originalTopicIds.filter((id) => topicsSet.has(id)));
  const newTopicIds = topicIds.filter((id) => !currentTopicIds.has(id));

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
  ]);
};

export const cacheCitations = async (objectiveId, activityReportObjectiveId, citations = []) => {
  let newCitations = [];
  // Delete all existing citations for this activity report objective.
  await ActivityReportObjectiveCitation.destroy({
    where: { activityReportObjectiveId },
    individualHooks: true,
    hookMetadata: { objectiveId },
  });

  // Get the goal for this objective.
  const goal = await Goal.findOne({
    attributes: ['grantId', 'createdVia'],
    where: {
      createdVia: 'monitoring',
    },
    include: [
      {
        model: Objective,
        as: 'objectives',
        where: { id: objectiveId },
        required: true,
      },
    ],
  });

  if (!goal) {
    auditLogger.info(
      `No monitoring goal found for objective ${objectiveId}. Skipping citation caching.`
    );
    return [];
  }

  // Create citations to save.
  if (citations && citations.length > 0) {
    // Get the grant id from the goal.
    const grantForThisCitation = goal.grantId;
    const citationReferenceKeys = new Set();

    newCitations = citations.reduce((acc, citation) => {
      // this shape is tested at the request level by Joi
      const { monitoringReferences } = citation;

      monitoringReferences.forEach((reference) => {
        const grantId = Number(reference.grantId);
        if (!Number.isInteger(grantId) || grantId !== grantForThisCitation) {
          return;
        }

        const parsedStandardId = Number(reference.standardId);
        const standardId = Number.isInteger(parsedStandardId) ? parsedStandardId : null;
        const findingId = trimToNull(reference.findingId);
        const reviewName = trimToNull(reference.reviewName);
        const grantNumber = trimToNull(reference.grantNumber);
        const findingType = trimToNull(reference.findingType);
        const findingSource = trimToNull(reference.findingSource);
        // eslint-disable-next-line max-len
        const acro = trimToNull(reference.acro);
        const citationText = trimToNull(reference.citation);
        const name =
          acro && citationText
            ? formatMonitoringCitationName({
                acro,
                citation: citationText,
                findingSource,
              })
            : null;
        const parsedSeverity = Number(reference.severity);
        const severity = Number.isInteger(parsedSeverity) ? parsedSeverity : null;
        let reportDeliveryDate = null;
        if (reference.reportDeliveryDate instanceof Date) {
          reportDeliveryDate = reference.reportDeliveryDate.toISOString();
        } else if (reference.reportDeliveryDate) {
          reportDeliveryDate = String(reference.reportDeliveryDate).trim();
        }
        const monitoringFindingStatusName = reference.monitoringFindingStatusName
          ? String(reference.monitoringFindingStatusName).trim()
          : null;

        if (
          !findingId ||
          !reviewName ||
          !grantNumber ||
          !Number.isInteger(standardId) ||
          !findingType ||
          !acro ||
          !Number.isInteger(severity) ||
          !reportDeliveryDate ||
          !monitoringFindingStatusName ||
          !name ||
          !citationText
        ) {
          throw new Error('Missing required citation field');
        }

        const citationReferenceKey = [findingId, grantId, reviewName, standardId].join('::');
        if (citationReferenceKeys.has(citationReferenceKey)) {
          return;
        }

        citationReferenceKeys.add(citationReferenceKey);

        acc.push({
          activityReportObjectiveId,
          citation: citationText,
          citationId: null,
          findingId,
          grantId,
          grantNumber,
          reviewName,
          standardId,
          findingType,
          findingSource,
          acro,
          severity,
          reportDeliveryDate,
          monitoringFindingStatusName,
          name,
        });
      });

      return acc;
    }, []);

    const findingIdentifiers = [
      ...new Set(newCitations.map(({ findingId }) => findingId).filter((findingId) => !!findingId)),
    ];

    if (findingIdentifiers.length > 0) {
      const numericFindingIds = [
        ...new Set(
          findingIdentifiers
            .map((findingIdentifier) => Number(findingIdentifier))
            .filter((findingIdentifier) => Number.isInteger(findingIdentifier))
        ),
      ];

      const citationWhereClauses = [
        {
          finding_uuid: {
            [Op.in]: findingIdentifiers,
          },
        },
      ];

      if (numericFindingIds.length > 0) {
        citationWhereClauses.push({
          mfid: {
            [Op.in]: numericFindingIds,
          },
        });
      }

      const foundCitations = await Citation.findAll({
        attributes: ['id', 'finding_uuid', 'mfid'],
        where: {
          [Op.or]: citationWhereClauses,
        },
      });

      const citationIdByIdentifier = foundCitations.reduce((acc, foundCitation) => {
        const { id, finding_uuid: findingUuid, mfid } = foundCitation;

        if (findingUuid) {
          acc.set(String(findingUuid), id);
        }
        if (mfid !== null && mfid !== undefined) {
          acc.set(String(mfid), id);
        }
        return acc;
      }, new Map());

      const citationIdByFindingId = new Map(
        findingIdentifiers
          .map((findingIdentifier) => [
            findingIdentifier,
            citationIdByIdentifier.get(findingIdentifier),
          ])
          .filter(([, citationId]) => citationId !== undefined)
      );

      const unresolvedFindingIds = findingIdentifiers.filter(
        (findingIdentifier) => !citationIdByFindingId.has(findingIdentifier)
      );

      if (unresolvedFindingIds.length > 0) {
        const errorMessage =
          `Unable to cache citations for objective ${objectiveId} ` +
          `and activity report objective ${activityReportObjectiveId}. ` +
          `No Citation record found for finding IDs: ${unresolvedFindingIds.join(', ')}`;
        auditLogger.error(errorMessage);
        throw new Error(errorMessage);
      }

      newCitations = newCitations.map((citation) => ({
        ...citation,
        legacy: false,
        citationId: citation.findingId ? citationIdByFindingId.get(citation.findingId) : null,
      }));
    }

    // If we have citations to save, create them.
    if (newCitations.length > 0) {
      return ActivityReportObjectiveCitation.bulkCreate(newCitations, { individualHooks: true });
    }
  }
  return newCitations;
};

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
  } = metadata;

  const objectiveId = objective.dataValues ? objective.dataValues.id : objective.id;
  let aro = await ActivityReportObjective.findOne({
    where: {
      objectiveId,
      activityReportId: reportId,
    },
    raw: true,
  });
  if (!aro) {
    aro = await ActivityReportObjective.create(
      {
        objectiveId,
        activityReportId: reportId,
      },
      { raw: true }
    );
  }
  const { id: activityReportObjectiveId } = aro;
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
  );

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
  ]);
};

export const cachePrompts = async (goalId, activityReportGoalId, promptResponses) => {
  const originalARGResponses = await ActivityReportGoalFieldResponse.findAll({
    attributes: ['id', 'goalTemplateFieldPromptId', 'response'],
    where: { activityReportGoalId },
    raw: true,
  });

  const { newPromptResponses, updatedPromptResponses, promptIds } = promptResponses
    // first we transform to match the correct column names
    .map(({ response, promptId }) => ({ response, goalTemplateFieldPromptId: promptId }))
    // then we reduce, separating the new and updated records
    .reduce(
      (acc, promptResponse) => {
        const currentPromptResponse = originalARGResponses.find(
          ({ goalTemplateFieldPromptId }) =>
            promptResponse.goalTemplateFieldPromptId === goalTemplateFieldPromptId
        );

        if (!currentPromptResponse) {
          // Record is in newData but not in currentData
          acc.newPromptResponses.push(promptResponse);
        } else if (
          // we check to see if the old response the new
          JSON.stringify(promptResponse.response) !== JSON.stringify(currentPromptResponse.response)
        ) {
          // Record is in both newData and currentData, but with different responses
          acc.updatedPromptResponses.push(promptResponse);
        }

        acc.promptIds.push(promptResponse.goalTemplateFieldPromptId);

        return acc;
      },
      { newPromptResponses: [], updatedPromptResponses: [], promptIds: [] }
    );

  // Find records in currentData but not in newData
  const removedPromptResponses = originalARGResponses.filter(
    ({ goalTemplateFieldPromptId }) => !promptIds.includes(goalTemplateFieldPromptId)
  );

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
  ]);
};

const cacheGoalMetadata = async (goal, reportId, isActivelyBeingEditing, prompts) => {
  // first we check to see if the activity report -> goal link already exists
  let arg = await ActivityReportGoal.findOne({
    where: {
      goalId: goal.id,
      activityReportId: reportId,
    },
  });

  // if it does, then we update it with the new values
  if (arg) {
    const activityReportGoalId = arg.id;
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
    );
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
    );
  }

  const finalPromises = [
    Goal.update({ onAR: true }, { where: { id: goal.id }, individualHooks: true }),
  ];

  // Save the prompts for the ARG.
  if (!prompts || !prompts.length) {
    // If no prompts are passed in get them from the goal.
    const goalPrompts = await GoalFieldResponse.findAll({
      attributes: [
        ['goalTemplateFieldPromptId', 'promptId'],
        [sequelize.col('prompt."title"'), 'title'],
        'response',
      ],
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
    });

    // if we have goal prompts call cache prompts with the goals prompts
    if (goalPrompts && goalPrompts.length) {
      finalPromises.push(cachePrompts(goal.id, arg.id, goalPrompts));
    }
  } else if (prompts.length) {
    finalPromises.push(cachePrompts(goal.id, arg.id, prompts));
  }
  return Promise.all(finalPromises);
};

async function destroyActivityReportObjectiveMetadata(
  activityReportObjectiveIdsToRemove,
  objectiveIds
) {
  return Array.isArray(activityReportObjectiveIdsToRemove) &&
    activityReportObjectiveIdsToRemove.length > 0
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
    : Promise.resolve();
}

export {
  cacheFiles,
  cacheGoalMetadata,
  cacheObjectiveMetadata,
  cacheResources,
  cacheTopics,
  destroyActivityReportObjectiveMetadata,
};
