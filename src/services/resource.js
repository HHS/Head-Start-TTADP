import { Op } from 'sequelize';
import {
  ActivityReport,
  ActivityReportResource,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  Goal,
  GoalResource,
  NextStep,
  NextStepResource,
  Objective,
  ObjectiveResource,
  Resource,
} from '../models';
import { VALID_URL_REGEX } from '../lib/urlUtils';
import { SOURCE_FIELD } from '../constants';

const REPORT_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORT.CONTEXT,
  SOURCE_FIELD.REPORT.NOTES,
];

const NEXTSTEP_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.NEXTSTEPS.NOTE,
];

const GOAL_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.GOAL.NAME,
  SOURCE_FIELD.GOAL.TIMEFRAME,
];

const REPORTGOAL_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORTGOAL.NAME,
  SOURCE_FIELD.REPORTGOAL.TIMEFRAME,
];

const OBJECTIVE_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.OBJECTIVE.TITLE,
];

const REPORTOBJECTIVE_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORTOBJECTIVE.TITLE,
  SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED,
];

// -----------------------------------------------------------------------------
// Resource Table
// -----------------------------------------------------------------------------
// Find or create a single resource
const findOrCreateResource = async (url) => {
  if (url === undefined || url === null || typeof url !== 'string') return undefined;
  let resource = await Resource.findOne({ where: { url }, raw: true, plain: true });
  if (!resource) {
    const newResource = await Resource.create({ url });
    resource = await newResource.get({ plain: true });
  }
  return resource;
};

// Find or create all resource for the list of urls passed.
const findOrCreateResources = async (urls) => {
  if (urls === undefined || urls === null || !Array.isArray(urls)) return [];
  let newURLs;
  const filteredUrls = [...new Set(urls.filter((url) => typeof url === 'string'))];
  const currentResources = filteredUrls.length > 0
    ? await Resource.findAll({
      where: {
        url: {
          [Op.in]: filteredUrls,
        },
      },
      raw: true,
    }) || []
    : [];
  if (currentResources !== undefined
    || currentResources !== null
    || currentResources.length !== filteredUrls.length) {
    const currentResourceURLs = new Set(currentResources
      .map((currentResource) => currentResource.url));
    newURLs = filteredUrls.filter((url) => !currentResourceURLs.has(url));
  }
  return [
    ...await Promise.all(newURLs.map(async (url) => {
      const resource = await Resource.create({ url });
      return resource.get({ plain: true });
    })),
    ...(currentResources || []),
  ].sort((a, b) => a.id < b.id);
};

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the autoDetectedFields.
const calculateIsAutoDetected = (sourceFields, autoDetectedFields) => (
  Array.isArray(sourceFields)
  && sourceFields.length > 0
  && Array.isArray(autoDetectedFields)
  && autoDetectedFields.length > 0
  && autoDetectedFields
    .filter((field) => sourceFields.includes(field))
    .length > 0
);

// Remap the value of an object attribute to a new attribute
const remapAttributes = (collection, from, to) => (
  Array.isArray(collection)
  && collection.length > 0
  && typeof from === 'string'
  && typeof to === 'string'
    ? collection.map((c) => {
      const result = c;
      result[to] = result[from];
      result[from] = undefined;
      delete result[from];
      return result;
    })
    : []
);

// Use regex to find all urls within the field
const collectURLsFromField = (field) => {
  if (typeof field !== 'string') return [];
  const urls = field.match(VALID_URL_REGEX) || [];
  return urls
    .reduce((matches, match) => {
      const exists = matches.find((m) => m === match);
      if (exists) {
        return matches;
      }
      return [...matches, match];
    }, []);
};

// Generate a colection of resoruce objects from the list of urls passed
const resourcesFromField = (
  genericId,
  urlsFromField,
  field,
  seed = [],
) => (typeof genericId === 'number'
  && genericId === parseInt(genericId, 10)
  && typeof field === 'string'
  && Array.isArray(urlsFromField)
  && Array.isArray(seed)
  ? urlsFromField.reduce((resources, url) => {
    const exists = resources.find((resource) => resource.url === url
      && resource.genericId === genericId);
    if (exists) {
      exists.sourceFields = [...new Set([...exists.sourceFields, field])];
      return resources;
    }
    return [...resources, {
      genericId,
      sourceFields: [field],
      url,
    }];
  }, seed)
  : seed);

// Merge all the records that share the same url and genericId, collecting all
// the sourceFields they are from.
const mergeRecordsByUrlAndGenericId = (records) => (
  Array.isArray(records)
    ? records
      .filter((resource) => (typeof resource.genericId === 'number'
        && resource.genericId === parseInt(resource.genericId, 10)
        && typeof resource.url === 'string'
        && Array.isArray(resource.sourceFields)
        && resource.sourceFields.length > 0))
      .reduce((resources, resource) => {
        const exists = resources.find((r) => r.genericId === resource.genericId
          && r.url === resource.url);
        if (exists) {
          exists.sourceFields = Array.isArray(resource.sourceFields)
            ? [...new Set([...exists.sourceFields, ...resource.sourceFields])]
            : exists.sourceFields;
          return resources;
        }
        return [...resources, resource];
      }, [])
    : []);

// Merge all the records that share the same resourceId and genericId, collecting all
// the sourceFields they are from.
const mergeRecordsByResourceIdAndGenericId = (records) => (
  Array.isArray(records)
    ? records
      .filter((resource) => (typeof resource.genericId === 'number'
        && resource.genericId === parseInt(resource.genericId, 10)
        && typeof resource.url === 'string'
        && Array.isArray(resource.sourceFields)
        && resource.sourceFields.length > 0))
      .reduce((resources, resource) => {
        const exists = resources.find((r) => r.genericId === resource.genericId
          && r.resourceId === resource.resourceId);
        if (exists) {
          exists.sourceFields = Array.isArray(resource.sourceFields)
            ? [...new Set([...exists.sourceFields, ...resource.sourceFields])]
            : exists.sourceFields;
          return resources;
        }
        return [...resources, resource];
      }, [])
    : []);

// Replace the url with the corresponding resourceId
const transformRecordByURLToResource = (records, resources) => (
  Array.isArray(records)
  && Array.isArray(resources)
    ? records
      .map((resource) => ({
        ...resource,
        resourceId: resources.find((r) => r.url === resource.url)?.id,
        url: undefined,
      }))
      .filter((resource) => resource.resourceId !== undefined
        && resource.resourceId !== null)
    : []);

// Compare the incomingResources and the currentResources to generate five sets of modifications:
// new: completely new records to be added.
// expanded: records that existed already, but now are referenced in additional sourceFields.
// delta: records that existed already, but now are referenced in additional sourceFields as well
//     as not referenced in priorly referenced sourceFields.
// reduced: records that existed already, but now not referenced in priorly referenced sourceFields.
// removed: records that existed already, that need to be removed
// Each of these are separate to allow for all of them to be executed as modifications to the
// database in parallel, as each of them will operate on distinct records with no overlap.
// Preventing any locking contentions between the five datasets. Once completethe five datasets
// are grouped into the three operations as follows:
// create: new
// update: expanded, delta, reduced
// destroy: remove
const filterResourcesForSync = (
  incomingResources,
  currentResources,
  calculateIsAutoDetectedFunc,
) => {
  if (!Array.isArray(incomingResources)
    || !Array.isArray(currentResources)) {
    return {
      create: [],
      update: [],
      destroy: [],
    };
  }
  // pull all of the new and expanded resources in a single pass over the incomingResources.
  const newExpandedResources = incomingResources
    .reduce((resources, resource) => {
      const matchingFromFields = currentResources
        .filter((cr) => cr.genericId === resource.genericId
        && cr.resourceId === resource.resourceId);
      const isCreated = matchingFromFields.length === 0;
      if (isCreated) {
        const created = resources.created
          ?.find((r) => r.genericId === resource.genericId
          && r.resourceId === resource.resourceId);
        if (created) {
          created.sourceFields = [...new Set([...created.sourceFields, ...resource.sourceFields])];
          return resources;
        }
        return {
          created: [
            ...resources.created,
            {
              genericId: resource.genericId,
              resourceId: resource.resourceId,
              sourceFields: resource.sourceFields,
            },
          ],
          expanded: resources.expanded,
        };
      }

      const isExpanded = matchingFromFields
        .filter((mff) => resource.sourceFields
          .filter((l) => mff.sourceFields.includes(l))
          .length < resource.sourceFields.length)
        .length > 0;
      if (isExpanded) {
        const expanded = resources.expanded
          ?.find((r) => r.genericId === resource.genericId
            && r.resourceId === resource.resourceId);
        const matching = matchingFromFields
          .find((r) => r.genericId === resource.genericId
            && r.resourceId === resource.resourceId);
        if (expanded) {
          expanded.sourceFields = [...new Set([
            ...expanded.sourceFields,
            ...resource.sourceFields,
          ])];
          return resources;
        }
        return {
          created: resources.created,
          expanded: [
            ...(resources.expanded || []),
            {
              genericId: resource.genericId,
              resourceId: resource.resourceId,
              sourceFields: [...new Set([
                ...matching.sourceFields,
                ...resource.sourceFields,
              ])],
            },
          ],
        };
      }

      return resources;
    }, { created: [], expanded: [] });

  // pull all of the removed and reduced resources in a single pass over the currentResources.
  const removedReducedResources = currentResources
    .reduce((resources, resource) => {
      const isRemoved = incomingResources
        .filter((rff) => rff.genericId === resource.genericId
          && rff.resourceId === resource.resourceId)
        .length === 0;
      if (isRemoved) {
        const removed = resources.removed
          ?.find((r) => r.genericId === resource.genericId);
        if (removed) {
          removed.resourceIds = [...removed.resourceIds, resource.resourceId];
          return resources;
        }
        return {
          removed: [
            ...resources.removed,
            {
              genericId: resource.genericId,
              resourceIds: [resource.resourceId],
            },
          ],
          reduced: resources.reduced,
        };
      }

      const matchingFromFields = incomingResources
        .filter((rff) => rff.genericId === resource.genericId
        && rff.resourceId === resource.resourceId);
      const isReduced = matchingFromFields
        .filter((mff) => resource.sourceFields
          .filter((l) => mff.sourceFields.includes(l))
          .length < resource.sourceFields.length)
        .length > 0;
      if (isReduced) {
        const reduced = resources.reduced
          ?.find((r) => r.genericId === resource.genericId
            && r.resourceId === resource.resourceId);
        const matching = matchingFromFields
          .find((r) => r.genericId === resource.genericId
            && r.resourceId === resource.resourceId);
        if (reduced) {
          reduced.sourceFields = reduced.sourceFields
            .filter((sourceField) => matching.sourceFields.includes(sourceField));
          return resources;
        }
        return {
          removed: resources.removed,
          reduced: [
            ...resources.reduced,
            {
              genericId: resource.genericId,
              resourceId: resource.resourceId,
              sourceFields: resource.sourceFields
                .filter((sourceField) => matching.sourceFields.includes(sourceField)),
            },
          ],
        };
      }

      return resources;
    }, { removed: [], reduced: [] });

  // collect the intersection of the expanded and reduced datasets to generate the delta dataset.
  const deltaFromExpanded = (newExpandedResources.expanded || [])
    .filter((neResource) => (removedReducedResources.reduced || [])
      .filter((rrResource) => neResource.genericId === rrResource.genericId
        && neResource.resourceId === rrResource.resourceId)
      .length > 0);
  const deltaFromReduced = (removedReducedResources.reduced || [])
    .filter((rrResource) => (newExpandedResources.expanded || [])
      .filter((neResource) => neResource.genericId === rrResource.genericId
        && neResource.resourceId === rrResource.resourceId)
      .length > 0);

  const resourceActions = {};
  // Generate the delta dataset
  resourceActions.delta = deltaFromExpanded
    ?.reduce((delta, resource) => {
      const exists = delta.find((r) => r.genericId === resource.genericId
        && r.resourceId === resource.resourceId);
      const fromReduced = deltaFromReduced
        ?.find((r) => r.genericId === resource.genericId
        && r.resourceId === resource.resourceId);
      const fromOriginal = currentResources
        .find((r) => r.genericId === resource.genericId
        && r.resourceId === resource.resourceId);
      const deltaSourceFields = resource.sourceFields
        .filter((sourceField) => !fromOriginal.sourceFields.includes(sourceField)
          || fromReduced?.sourceFields.includes(sourceField));
      if (exists) {
        exists.sourceFields = deltaSourceFields;
        return delta;
      }
      return [
        ...delta,
        {
          ...resource,
          sourceFields: deltaSourceFields,
        },
      ];
    }, [])
    ?.map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));
  // Remove the records of the delta dataset from the expanded dataset.
  resourceActions.expanded = newExpandedResources.expanded
    ?.filter((neResource) => resourceActions.delta
      .filter((dResource) => dResource.genericId === neResource.genericId
        && dResource.resourceId === neResource.resourceId)
      .length === 0)
    .map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));
  // Remove the records of the delta dataset from the reduced dataset.
  resourceActions.reduced = removedReducedResources.reduced
    .filter((rrResource) => (resourceActions.delta || [])
      .filter((dResource) => dResource.genericId === rrResource.genericId
        && dResource.resourceId === rrResource.resourceId)
      .length === 0);

  resourceActions.new = newExpandedResources.created
    ?.map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));

  // Recreate the remove dataset combining the removed and reduced where the reduced no longer
  // references any sourceFields.
  resourceActions.removed = [
    ...removedReducedResources.removed,
    ...resourceActions.reduced
      .filter((resource) => resource.sourceFields.length === 0)
      .reduce((resources, resource) => {
        const exists = resources
          .find((r) => r.genericId === resource.genericId);

        if (exists) {
          exists.resourceIds = [...exists.resourceIds, resource.resourceId];
          return resources;
        }

        return [
          ...resources,
          {
            ...resource,
            resourceIds: [resource.resourceId],
            resourceId: undefined,
          },
        ];
      }, []),
  ].reduce((resources, resource) => {
    const exists = resources
      .find((r) => r.genericId === resource.genericId);

    if (exists) {
      exists.resourceIds = [...exists.resourceIds, resource.resourceIds];
      return resources;
    }

    return [...resources, resource];
  }, []);

  // Remove the empty sourceField records from the reduced dataset.
  resourceActions.reduced = resourceActions.reduced
    .filter((resource) => resource.sourceFields.length !== 0)
    .map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));

  return {
    create: resourceActions.new,
    update: [
      ...(resourceActions.expanded || []),
      ...(resourceActions.delta || []),
      ...(resourceActions.reduced || []),
    ],
    destroy: resourceActions.removed,
  };
};

const getResourcesForModel = async (
  model,
  genericId,
  autoDetectedFields,
  includeAutoDetected = false,
) => (
  includeAutoDetected
    ? model.findAll({
      where: {
        id: genericId,
      },
      include: [
        {
          model: Resource,
          as: 'resource',
        },
      ],
    })
    : model.findAll({
      where: {
        id: genericId,
        sourceFields: { [Op.not.contains]: autoDetectedFields },
      },
      include: [
        {
          model: Resource,
          as: 'resource',
        },
      ],
    }));
// -----------------------------------------------------------------------------
// ActivityReports Resource Processing
// -----------------------------------------------------------------------------

// Identify if passed sourceFields contain one or more of the ACTIVITY_REPORT_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.REPORT and log exceptions
const calculateIsAutoDetectedForActivityReports = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, REPORT_AUTODETECTED_FIELDS);

// Using the five dataset, each can be run in "parallel" to reduce latancy when applied to the
// database. This should result in better performance.
const syncResourcesForActivityReport = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => ActivityReportResource.create({
    activityReportId: resource.activityReportId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => ActivityReportResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        activityReportId: resource.activityReportId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? ActivityReportResource.destroy({
      where: {
        activityReportId: resource.activityReportId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportForResources = async (activityReport, urls) => {
  // Either used the current resource data from the activityReport passed in or look it up.
  const currentResources = activityReport.activityReportResources
    ? activityReport.activityReportResources
    : await ActivityReportResource.findAll({
      where: { activityReportId: activityReport.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'activityReportId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromECLKC = collectURLsFromField(activityReport.ECLKCResourcesUsed);
  const urlsFromNonECLKC = collectURLsFromField(activityReport.nonECLKCResourcesUsed);
  const urlsFromContext = collectURLsFromField(activityReport.context);
  const urlsFromNotes = collectURLsFromField(activityReport.additionalNotes);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromECLKC,
    ...urlsFromNonECLKC,
    ...urlsFromContext,
    ...urlsFromNotes,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for each of the fields.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      activityReport.id,
      urlsFromECLKC,
      SOURCE_FIELD.REPORT.ECLKC,
    ),
    ...resourcesFromField(
      activityReport.id,
      urlsFromNonECLKC,
      SOURCE_FIELD.REPORT.NONECLKC,
    ),
    ...resourcesFromField(
      activityReport.id,
      urlsFromContext,
      SOURCE_FIELD.REPORT.CONTEXT,
    ),
    ...resourcesFromField(
      activityReport.id,
      urlsFromNotes,
      SOURCE_FIELD.REPORT.NOTES,
    ),
    ...resourcesFromField(
      activityReport.id,
      urlsFromResource,
      SOURCE_FIELD.REPORT.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForActivityReports,
  );

  // switch from generic genericId to activityReportId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'activityReportId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'activityReportId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'activityReportId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForActivityReport(resourcesToSync);
  return getResourcesForModel(
    ActivityReportResource,
    activityReport.id,
    REPORT_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportForResourcesById = async (activityReportId, urls) => {
  const activityReport = await ActivityReport.findOne({
    where: { id: activityReportId },
    include: [
      {
        model: ActivityReportResource,
        as: 'activityReportResources',
        required: false,
      },
    ],
  });

  return activityReport
    && typeof activityReport === 'object'
    ? processActivityReportForResources(activityReport, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
// NextSteps Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.NEXTSTEPS
// and log exceptions
const calculateIsAutoDetectedForNextStep = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, NEXTSTEP_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForNextStep = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => NextStepResource.create({
    nextStepId: resource.nextStepId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => NextStepResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        nextStepId: resource.nextStepId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? NextStepResource.destroy({
      where: {
        nextStepId: resource.nextStepId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processNextStepForResources = async (nextStep, urls) => {
  // Either used the current resource data from the nextStep passed in or look it up.
  const currentResources = nextStep.nextStepResources
    ? nextStep.nextStepResources
    : await NextStepResource.findAll({
      where: { nextStepId: nextStep.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'nextStepId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromNote = collectURLsFromField(nextStep.note);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromNote,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for the field.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      nextStep.id,
      urlsFromNote,
      SOURCE_FIELD.NEXTSTEPS.NOTE,
    ),
    ...resourcesFromField(
      nextStep.id,
      urlsFromResource,
      SOURCE_FIELD.NEXTSTEPS.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForNextStep,
  );

  // switch from generic genericId to nextStepId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'nextStepId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'nextStepId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'nextStepId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForNextStep(resourcesToSync);
  return getResourcesForModel(
    NextStepResource,
    nextStep.id,
    NEXTSTEP_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processNextStepForResourcesById = async (nextStepId, urls) => {
  const nextStep = await NextStep.findOne({
    where: { id: nextStepId },
    include: [
      {
        model: NextStepResource,
        as: 'nextStepResources',
        required: false,
      },
    ],
  });

  return nextStep
    && typeof nextStep === 'object'
    ? processNextStepForResources(nextStep, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
// Goals Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.GOAL
// and log exceptions
const calculateIsAutoDetectedForGoal = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, GOAL_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForGoal = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => GoalResource.create({
    goalId: resource.goalId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => GoalResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        goalId: resource.goalId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? GoalResource.destroy({
      where: {
        goalId: resource.goalId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processGoalForResources = async (goal, urls) => {
  // Either used the current resource data from the nextStep passed in or look it up.
  const currentResources = goal.goalResources
    ? goal.goalResources
    : await GoalResource.findAll({
      where: { goalId: goal.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'goalId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromName = collectURLsFromField(goal.name);
  const urlsFromTimeframe = collectURLsFromField(goal.timeframe);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromName,
    ...urlsFromTimeframe,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for the field.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      goal.id,
      urlsFromName,
      SOURCE_FIELD.GOAL.NAME,
    ),
    ...resourcesFromField(
      goal.id,
      urlsFromTimeframe,
      SOURCE_FIELD.GOAL.TIMEFRAME,
    ),
    ...resourcesFromField(
      goal.id,
      urlsFromResource,
      SOURCE_FIELD.OBJECTIVE.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForGoal,
  );

  // switch from generic genericId to goalId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'goalId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'goalId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'goalId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForGoal(resourcesToSync);
  return getResourcesForModel(
    GoalResource,
    goal.id,
    GOAL_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processGoalForResourcesById = async (goalId, urls) => {
  const goal = await Goal.findOne({
    where: { id: goalId },
    include: [
      {
        model: GoalResource,
        as: 'goalResources',
        required: false,
      },
    ],
  });

  return goal
    && typeof goal === 'object'
    ? processGoalForResources(goal, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
// Report Goal Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.REPORTGOAL
// and log exceptions
const calculateIsAutoDetectedForActivityReportGoal = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, REPORTGOAL_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForActivityReportGoal = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => ActivityReportGoalResource.create({
    activityReportGoalId: resource.activityReportGoalId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => ActivityReportGoalResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        activityReportGoalId: resource.activityReportGoalId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? ActivityReportGoalResource.destroy({
      where: {
        activityReportGoalId: resource.activityReportGoalId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportGoalForResources = async (activityReportGoal, urls) => {
  // Either used the current resource data from the activityReportGoal passed in or look it up.
  const currentResources = activityReportGoal.goalResources
    ? activityReportGoal.goalResources
    : await ActivityReportGoalResource.findAll({
      where: { activityReportGoalId: activityReportGoal.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'activityReportGoalId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromTitle = collectURLsFromField(activityReportGoal.title);
  const urlsFromTTAProvided = collectURLsFromField(activityReportGoal.ttaProvided);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromTitle,
    ...urlsFromTTAProvided,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for the field.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      activityReportGoal.id,
      urlsFromTitle,
      SOURCE_FIELD.REPORTGOAL.TITLE,
    ),
    ...resourcesFromField(
      activityReportGoal.id,
      urlsFromTTAProvided,
      SOURCE_FIELD.REPORTGOAL.TTAPROVIDED,
    ),
    ...resourcesFromField(
      activityReportGoal.id,
      urlsFromResource,
      SOURCE_FIELD.REPORTGOAL.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForActivityReportGoal,
  );

  // switch from generic genericId to activityReportGoalId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'activityReportGoalId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'activityReportGoalId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'activityReportGoalId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForActivityReportGoal(resourcesToSync);
  return getResourcesForModel(
    ActivityReportGoalResource,
    activityReportGoal.id,
    REPORTGOAL_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportGoalForResourcesById = async (activityReportGoalId, urls) => {
  const goal = await ActivityReportGoal.findOne({
    where: { id: activityReportGoalId },
    include: [
      {
        model: ActivityReportGoalResource,
        as: 'activityReportGoalResources',
        required: false,
      },
    ],
  });

  return goal
    && typeof goal === 'object'
    ? processActivityReportGoalForResources(goal, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
// Objectives Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.OBJECTIVES
// and log exceptions
const calculateIsAutoDetectedForObjective = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, OBJECTIVE_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForObjective = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => ObjectiveResource.create({
    objectiveId: resource.objectiveId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => ObjectiveResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        objectiveId: resource.objectiveId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? ObjectiveResource.destroy({
      where: {
        objectiveId: resource.objectiveId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processObjectiveForResources = async (objective, urls) => {
  // Either used the current resource data from the nextStep passed in or look it up.
  const currentResources = objective.objectiveResources
    ? objective.objectiveResources
    : await ObjectiveResource.findAll({
      where: { objectiveId: objective.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'objectiveId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromTitle = collectURLsFromField(objective.title);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);
  // TODO: need to figure out ttaProvided from the aro's

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromTitle,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for the field.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      objective.id,
      urlsFromTitle,
      SOURCE_FIELD.OBJECTIVE.TITLE,
    ),
    ...resourcesFromField(
      objective.id,
      urlsFromResource,
      SOURCE_FIELD.OBJECTIVE.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForObjective,
  );

  // switch from generic genericId to objectiveId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'objectiveId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'objectiveId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'objectiveId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForObjective(resourcesToSync);
  return getResourcesForModel(
    ObjectiveResource,
    objective.id,
    OBJECTIVE_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processObjectiveForResourcesById = async (objectiveId, urls) => {
  const objective = await Objective.findOne({
    where: { id: objectiveId },
    include: [
      {
        model: ObjectiveResource,
        as: 'objectiveResources',
        required: false,
      },
    ],
  });

  return objective
    && typeof objective === 'object'
    ? processObjectiveForResources(objective, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
// Report Objectives Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.REPORTOBJECTIVES
// and log exceptions
const calculateIsAutoDetectedForActivityReportObjective = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, REPORTOBJECTIVE_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForActivityReportObjective = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => ActivityReportObjectiveResource.create({
    activityReportObjectiveId: resource.activityReportObjectiveId,
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
    isAutoDetected: resource.isAutoDetected,
  })),
  ...resources.update.map(async (resource) => ActivityReportObjectiveResource.update(
    {
      sourceFields: resource.sourceFields,
      isAutoDetected: resource.isAutoDetected,
    },
    {
      where: {
        activityReportObjectiveId: resource.activityReportObjectiveId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId: resource.activityReportObjectiveId,
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportObjectiveForResources = async (activityReportObjective, urls, resourceIds) => {
  // Either used the current resource data from the activityReportObjective passed in or look it up.
  const currentResources = activityReportObjective.objectiveResources
    ? activityReportObjective.objectiveResources
    : await ActivityReportObjectiveResource.findAll({
      where: { activityReportObjectiveId: activityReportObjective.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, 'activityReportObjectiveId', 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFromTitle = collectURLsFromField(activityReportObjective.title);
  const urlsFromTTAProvided = collectURLsFromField(activityReportObjective.ttaProvided);
  const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Find or create resources for each of the urls collected.
  const resourcesWithId = await findOrCreateResources([...new Set([
    ...urlsFromTitle,
    ...urlsFromTTAProvided,
    ...urlsFromResource,
  ])]);

  // Create an array of resource objects from all the data collected for the field.
  const incomingResourcesRaw = [
    ...resourcesFromField(
      activityReportObjective.id,
      urlsFromTitle,
      SOURCE_FIELD.REPORTOBJECTIVE.TITLE,
    ),
    ...resourcesFromField(
      activityReportObjective.id,
      urlsFromTTAProvided,
      SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED,
    ),
    ...resourcesFromField(
      activityReportObjective.id,
      urlsFromResource,
      SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForActivityReportObjective,
  );

  // switch from generic genericId to activityReportObjectiveId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', 'activityReportObjectiveId'),
    update: remapAttributes(filteredResources.update, 'genericId', 'activityReportObjectiveId'),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', 'activityReportObjectiveId'),
  };

  // Save the distinct datasets to the database.
  await syncResourcesForActivityReportObjective(resourcesToSync);
  return getResourcesForModel(
    ActivityReportObjectiveResource,
    activityReportObjective.id,
    REPORTOBJECTIVE_AUTODETECTED_FIELDS,
  );
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportObjectiveForResourcesById = async (activityReportObjectiveId, urls) => {
  const objective = await ActivityReportObjective.findOne({
    where: { id: activityReportObjectiveId },
    include: [
      {
        model: ActivityReportObjectiveResource,
        as: 'activityReportObjectiveResources',
        required: false,
      },
    ],
  });

  return objective
    && typeof objective === 'object'
    ? processActivityReportObjectiveForResources(objective, urls)
    : Promise.resolve();
};

// -----------------------------------------------------------------------------
const getResourcesForActivityReports = async (
  reportIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ActivityReportResource,
  reportIds,
  REPORT_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

const getResourcesForNextSteps = async (
  nextStepIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  NextStepResource,
  nextStepIds,
  NEXTSTEP_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

const getResourcesForGoals = async (
  goalIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  GoalResource,
  goalIds,
  GOAL_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

const getResourcesForActivityReportGoals = async (
  goalIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ActivityReportGoalResource,
  goalIds,
  REPORTGOAL_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

const getResourcesForObjectives = async (
  objectiveIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ObjectiveResource,
  objectiveIds,
  OBJECTIVE_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

const getResourcesForActivityReportObjectives = async (
  objectiveIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ActivityReportObjectiveResource,
  objectiveIds,
  REPORTOBJECTIVE_AUTODETECTED_FIELDS,
  includeAutoDetected,
);

export {
  // Resource Table
  findOrCreateResource,
  findOrCreateResources,
  // Helper functions
  calculateIsAutoDetected,
  remapAttributes,
  collectURLsFromField,
  resourcesFromField,
  mergeRecordsByUrlAndGenericId,
  transformRecordByURLToResource,
  filterResourcesForSync,
  // ActivityReports Resource Processing
  calculateIsAutoDetectedForActivityReports,
  syncResourcesForActivityReport,
  processActivityReportForResources,
  processActivityReportForResourcesById,
  // NextSteps Resource Processing
  calculateIsAutoDetectedForNextStep,
  syncResourcesForNextStep,
  processNextStepForResources,
  processNextStepForResourcesById,
  // Goal Resource processing
  calculateIsAutoDetectedForGoal,
  syncResourcesForGoal,
  processGoalForResources,
  processGoalForResourcesById,
  // ActivityReportGoal Resource Processing
  calculateIsAutoDetectedForActivityReportGoal,
  syncResourcesForActivityReportGoal,
  processActivityReportGoalForResources,
  processActivityReportGoalForResourcesById,
  // Objective Resource processing
  calculateIsAutoDetectedForObjective,
  syncResourcesForObjective,
  processObjectiveForResources,
  processObjectiveForResourcesById,
  // ActivityReportObjective Resource Processing
  calculateIsAutoDetectedForActivityReportObjective,
  syncResourcesForActivityReportObjective,
  processActivityReportObjectiveForResources,
  processActivityReportObjectiveForResourcesById,

  getResourcesForActivityReports,
  getResourcesForNextSteps,
  getResourcesForGoals,
  getResourcesForActivityReportGoals,
  getResourcesForObjectives,
  getResourcesForActivityReportObjectives,
};
