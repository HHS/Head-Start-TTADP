import { Op } from 'sequelize';
import {
  ActivityReport,
  ActivityReportResource,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  NextStep,
  NextStepResource,
  Objective,
  ObjectiveResource,
  Resource,
} from '../models';
import { VALID_URL_REGEX } from '../lib/urlUtils';
import { SOURCE_FIELD } from '../constants';

const ACTIVITYREPORT_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORT.CONTEXT,
  SOURCE_FIELD.REPORT.NOTES,
];

const NEXTSTEPS_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.NEXTSTEPS.NOTE,
  SOURCE_FIELD.NEXTSTEPS.RESOURCE,
];

const OBJECTIVES_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.OBJECTIVE.TITLE,
  SOURCE_FIELD.OBJECTIVE.TTAPROVIDED,
  SOURCE_FIELD.OBJECTIVE.RESOURCE,
];

const REPORTOBJECTIVES_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORTOBJECTIVE.TITLE,
  SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED,
  SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE,
];

// -----------------------------------------------------------------------------
// Resource Table
// -----------------------------------------------------------------------------
// Find or create a single resource
const findOrCreateResource = async (url) => {
  let resource = await Resource.findOne({ where: { url } });
  if (!resource) {
    resource = await Resource.create({ url });
  }
  return resource;
};

// Find or create all resource for the list of urls passed.
const findOrCreateResources = async (urls) => {
  let newURLs;
  const currentResources = await Resource.findAll({ where: { url: { [Op.in]: urls } } });
  if (!currentResources
    || currentResources.length !== urls.length) {
    const currentResourceURLs = new Set(currentResources
      .map((currentResource) => currentResource.url));
    newURLs = [...new Set(urls.filter((url) => !currentResourceURLs.has(url)))];
  }
  return [
    ...Promise.all(newURLs.map(async (url) => Resource.create({ url }))),
    ...currentResources,
  ];
};

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the autoDetectedFields.
const calculateIsAutoDetected = (sourceFields, autoDetectedFields) => autoDetectedFields
  .filter((field) => sourceFields.includes(field))
  .length > 0;

// Use regex to find all urls within the field
const collectURLsFromField = (field) => field
  .match(VALID_URL_REGEX || 'g')
  .filter((url) => url.match([a-zA-Z]));

// Generate a colection of resoruce objects from the list of urls passed
const resourcesFromField = (
  tableId,
  urlsFromField,
  field,
) => urlsFromField.reduce((resources, url) => {
  const exists = resources.find((resource) => resource.url === url);
  if (exists) {
    exists.sourceFields = [...new Set([...exists.sourceFields, field])];
    return resources;
  }
  return [...resources, {
    tableId,
    sourceFields: [field],
    url,
  }];
});

// Merge all the records that share the same url and tableId, collecting all
// the sourceFields they are from.
const mergeRecordsByUrlAndTableId = (records) => records
  .reduce((resources, resource) => {
    const exists = resources.find((r) => r.tableId === resource.tableId
      && r.url === resource.url);
    if (exists) {
      exists.sourceFields = [...new Set([...exists.sourceFields, ...resource.sourceFields])];
      return resources;
    }
    return [...resources, resource];
  });

// Replace the url with the corresponding resourceId
const transformRecordByURLToResource = (records, resources) => records
  .map((resource) => ({
    ...resource,
    resourceId: resources.find((r) => r.url === resource.url).id,
    url: undefined,
  }));

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
const filterResourcesForSync = async (
  incomingResources,
  currentResources,
  calculateIsAutoDetectedFunc,
) => {
  // pull all of the new and expanded resources in a single pass over the incomingResources.
  const newExpandedResources = incomingResources
    .reduce((resources, resource) => {
      const isCreated = currentResources
        .filter((oarr) => oarr.tableId === resource.tableId
          && oarr.resourceId === resource.resourceId)
        .length === 0;
      if (isCreated) {
        const created = resources.created
          .find((r) => r.tableId === resource.tableId);
        if (created) {
          created.sourceFields = [...new Set([...created.sourceFields, ...resource.sourceFields])];
          return resources;
        }
        return {
          created: [
            ...resources.created,
            {
              tableId: resource.tableId,
              resourceId: resource.resourceId,
              sourceFields: resource.sourceFields,
            },
          ],
          reduced: resources.reduced,
        };
      }

      const matchingFromFields = currentResources
        .filter((oarr) => oarr.tableId === resource.tableId
        && oarr.resourceId === resource.resourceId);
      const isExpanded = matchingFromFields.filter((oarr) => resource.sourceFields
        .filter((sourceField) => oarr.sourceFields.includes(sourceField))
        .length < resource.sourceFields.length)
        .length === 0;
      if (isExpanded) {
        const expanded = resources.expanded
          .find((r) => r.tableId === resource.tableId
            && r.resourceId === resource.resourceId);
        const matching = matchingFromFields
          .find((r) => r.tableId === resource.tableId
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
            ...resources.expanded,
            {
              tableId: resource.tableId,
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
    });
  // pull all of the removed and reduced resources in a single pass over the currentResources.
  const removedReducedResources = currentResources
    .reduce((resources, resource) => {
      const isRemoved = incomingResources
        .filter((rff) => rff.tableId === resource.tableId
          && rff.resourceId === resource.resourceId)
        .length === 0;
      if (isRemoved) {
        const removed = resources.removed
          .find((r) => r.tableId === resource.tableId);
        if (removed) {
          removed.resourceIds = [...removed.resourceIds, resource.resourceId];
          return resources;
        }
        return {
          removed: [
            ...resources.removed,
            {
              tableId: resource.tableId,
              resourceIds: [resource.resourceId],
            },
          ],
          reduced: resources.reduced,
        };
      }

      const matchingFromFields = incomingResources
        .filter((rff) => rff.tableId === resource.tableId
        && rff.resourceId === resource.resourceId);
      const isReduced = matchingFromFields.filter((rff) => resource.sourceFields
        .filter((sourceField) => rff.sourceFields.includes(sourceField))
        .length < resource.sourceFields.length)
        .length === 0;
      if (isReduced) {
        const reduced = resources.reduced
          .find((r) => r.tableId === resource.tableId
            && r.resourceId === resource.resourceId);
        const matching = matchingFromFields
          .find((r) => r.tableId === resource.tableId
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
              tableId: resource.tableId,
              resourceId: resource.resourceId,
              sourceFields: resource.sourceFields
                .filter((sourceField) => matching.sourceFields.includes(sourceField)),
            },
          ],
        };
      }

      return resources;
    });

  // collect the intersection of the expanded and reduced datasets to generate the delta dataset.
  const deltaFromExpanded = newExpandedResources.expanded
    .filter((neResource) => removedReducedResources.reduced
      .filter((rrResource) => neResource.tableId === rrResource.tableId
        && neResource.resourceId === rrResource.resourceId)
      .length > 0);
  const deltaFromReduced = removedReducedResources.expanded
    .filter((rrResource) => newExpandedResources.reduced
      .filter((neResource) => neResource.tableId === rrResource.tableId
        && neResource.resourceId === rrResource.resourceId)
      .length > 0);
  const resourceActions = {};
  // Generate the delta dataset
  resourceActions.delta = deltaFromExpanded
    .reduce((delta, resource) => {
      const exists = delta.find((r) => r.tableId === resource.tableId
        && r.resourceId === resource.resourceId);
      const fromReduced = deltaFromReduced
        .find((r) => r.tableId === resource.tableId
        && r.resourceId === resource.resourceId);
      const fromOriginal = currentResources
        .find((r) => r.tableId === resource.tableId
        && r.resourceId === resource.resourceId);
      const deltaSourceFields = resource.sourceFields
        .filter((sourceField) => !fromOriginal.sourceFields.includes(sourceField)
          || fromReduced.sourceFields.includes(sourceField));
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
    })
    .map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));
  // Remove the records of the delta dataset from the expanded dataset.
  resourceActions.expanded = newExpandedResources
    .filter((neResource) => resourceActions.delta
      .filter((dResource) => dResource.tableId === neResource.tableId
        && dResource.resourceId === neResource.resourceId)
      .length === 0)
    .map((resource) => ({
      ...resource,
      isAutoDetected: calculateIsAutoDetectedFunc(resource.sourceFields),
    }));
  // Remove the records of the delta dataset from the reduced dataset.
  resourceActions.reduced = removedReducedResources
    .filter((rrResource) => resourceActions.delta
      .filter((dResource) => dResource.tableId === rrResource.tableId
        && dResource.resourceId === rrResource.resourceId)
      .length === 0);

  resourceActions.new = newExpandedResources.new
    .map((resource) => ({
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
          .find((r) => r.tableId === resource.tableId);

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
      }),
  ].reduce((resources, resource) => {
    const exists = resources
      .find((r) => r.tableId === resource.tableId);

    if (exists) {
      exists.resourceIds = [...exists.resourceIds, resource.resourceIds];
      return resources;
    }

    return [...resources, resource];
  });

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
      ...resourceActions.expanded,
      ...resourceActions.delta,
      ...resourceActions.reduced,
    ],
    destroy: resourceActions.removed,
  };
};
// -----------------------------------------------------------------------------
// ActivityReports Resource Processing
// -----------------------------------------------------------------------------

// Identify if passed sourceFields contain one or more of the ACTIVITY_REPORT_AUTODETECTED_FIELDS.
const calculateIsAutoDetectedForActivityReports = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, ACTIVITYREPORT_AUTODETECTED_FIELDS);

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
        activityReportId: resources.activityReportId,
        resourceId: { [Op.in]: resources.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

const activityReportIdToGeneric = (resources) => resources
  .map((resource) => ({
    ...resource,
    tableId: resource.activityReportId,
    activityReportId: undefined,
  }));

const genericToActivityReportId = (resources) => resources
  .map((resource) => ({
    ...resource,
    activityReportId: resource.tableId,
    tableId: undefined,
  }));

// Process the current values on the report into the database for all referenced resources.
const processActivityReportForResources = async (activityReport, urls) => {
  // Either used the current resource data from the activityReport passed in or look it up.
  const currentResources = activityReport.activityReportResources
    ? activityReport.activityReportResources
    : await ActivityReportResource.findAll({
      where: { activityReportId: activityReport.id },
      raw: true,
    });

  // convert to generic tableId to use generic modifier methods
  const currentResourcesGeneric = activityReportIdToGeneric(currentResources);

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

  // Merge all the records that share the same url and tableId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndTableId(incomingResourcesRaw);

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

  // switch from generic tableId to nextStepId, regroup to the create, update, and delete actions.
  const resourcesToSync = {
    create: genericToActivityReportId(filteredResources.create),
    update: genericToActivityReportId(filteredResources.update),
    destroy: genericToActivityReportId(filteredResources.destroy),
  };

  // Save the distinct datasets to the database.
  return syncResourcesForActivityReport(resourcesToSync);
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
      },
    ],
  });

  return processActivityReportForResources(activityReport, urls);
};

// -----------------------------------------------------------------------------
// NextSteps Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
const calculateIsAutoDetectedForNextSteps = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, NEXTSTEPS_AUTODETECTED_FIELDS);

const nextStepIdToGeneric = (resources) => resources
  .map((resource) => ({
    ...resource,
    tableId: resource.activityReportId,
    nextStepId: undefined,
  }));

const genericToNextStepId = (resources) => resources
  .map((resource) => ({
    ...resource,
    nextStepId: resource.tableId,
    tableId: undefined,
  }));

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForNextSteps = async (resources) => Promise.all([
  ...resources.create.map(async (resource) => NextStepResource.create({
    nextStepId: resource.nextStepId,
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
        nextStepId: resource.nextStepId,
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? ActivityReportResource.destroy({
      where: {
        nextStepId: resources.nextStepId,
        resourceId: { [Op.in]: resources.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processNextStepsForResources = async (nextStep, urls) => {
  // Either used the current resource data from the nextStep passed in or look it up.
  const currentResources = nextStep.nextStepResources
    ? nextStep.nextStepResources
    : await NextStepResource.findAll({
      where: { nextStepId: nextStep.id },
      raw: true,
    });

  // convert to generic tableId to use generic modifier methods
  const currentResourcesGeneric = nextStepIdToGeneric(currentResources);

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

  // Merge all the records that share the same url and tableId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndTableId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForNextSteps,
  );

  // switch from generic tableId to nextStepId, regroup to the create, update, and delete actions.
  const resourcesToSync = {
    create: genericToNextStepId(filteredResources.create),
    update: genericToNextStepId(filteredResources.update),
    destroy: genericToNextStepId(filteredResources.destroy),
  };

  // Save the distinct datasets to the database.
  return syncResourcesForNextSteps(resourcesToSync);
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processNextStepsForResourcesById = async (nextStepId, urls) => {
  const nextStep = await NextStep.findOne({
    where: { id: nextStepId },
    include: [
      {
        model: NextStepResource,
        as: 'nextStepResources',
      },
    ],
  });

  return processNextStepsForResources(nextStep, urls);
};

// -----------------------------------------------------------------------------
// Objectives Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
const calculateIsAutoDetectedForObjectives = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, OBJECTIVES_AUTODETECTED_FIELDS);

const objectiveIdToGeneric = (resources) => resources
  .map((resource) => ({
    ...resource,
    tableId: resource.objectiveId,
    objectiveId: undefined,
  }));

const genericToObjectiveId = (resources) => resources
  .map((resource) => ({
    ...resource,
    objectiveId: resource.tableId,
    tableId: undefined,
  }));

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForObjectives = async (resources) => Promise.all([
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
        objectiveId: resources.objectiveId,
        resourceId: { [Op.in]: resources.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processObjectivesForResources = async (objective, urls) => {
  // Either used the current resource data from the nextStep passed in or look it up.
  const currentResources = objective.objectiveResources
    ? objective.objectiveResources
    : await ObjectiveResource.findAll({
      where: { objectiveId: objective.id },
      raw: true,
    });

  // convert to generic tableId to use generic modifier methods
  const currentResourcesGeneric = nextStepIdToGeneric(currentResources);

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
      urlsFromNote,
      SOURCE_FIELD.OBJECTIVE.TITLE,
    ),
    ...resourcesFromField(
      objective.id,
      urlsFromResource,
      SOURCE_FIELD.OBJECTIVE.RESOURCE,
    ),
  ];

  // Merge all the records that share the same url and tableId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndTableId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForObjectives,
  );

  // switch from generic tableId to nextStepId, regroup to the create, update, and delete actions.
  const resourcesToSync = {
    create: genericToObjectiveId(filteredResources.create),
    update: genericToObjectiveId(filteredResources.update),
    destroy: genericToObjectiveId(filteredResources.destroy),
  };

  // Save the distinct datasets to the database.
  return syncResourcesForObjectives(resourcesToSync);
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processObjectivesForResourcesById = async (objectiveId, urls) => {
  const objective = await Objective.findOne({
    where: { id: objectiveId },
    include: [
      {
        model: ObjectiveResource,
        as: 'objectiveResources',
      },
    ],
  });

  return processObjectivesForResources(objective, urls);
};

// -----------------------------------------------------------------------------
// Objectives Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
const calculateIsAutoDetectedForActivityReportObjectives = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, REPORTOBJECTIVES_AUTODETECTED_FIELDS);

const activityReportObjectiveIdToGeneric = (resources) => resources
  .map((resource) => ({
    ...resource,
    tableId: resource.activityReportObjectiveId,
    activityReportObjectiveId: undefined,
  }));

const genericToActivityReportObjectiveId = (resources) => resources
  .map((resource) => ({
    ...resource,
    activityReportObjectiveId: resource.tableId,
    tableId: undefined,
  }));

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForActivityReportObjectives = async (resources) => Promise.all([
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
        activityReportObjectiveId: resources.activityReportObjectiveId,
        resourceId: { [Op.in]: resources.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportObjectivesForResources = async (activityReportObjective, urls) => {
  // Either used the current resource data from the activityReportObjective passed in or look it up.
  const currentResources = activityReportObjective.objectiveResources
    ? activityReportObjective.objectiveResources
    : await ActivityReportObjectiveResource.findAll({
      where: { activityReportObjective: activityReportObjective.id },
      raw: true,
    });

  // convert to generic tableId to use generic modifier methods
  const currentResourcesGeneric = activityReportObjectiveIdToGeneric(currentResources);

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

  // Merge all the records that share the same url and tableId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndTableId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResourcesTransformed,
    currentResourcesGeneric,
    calculateIsAutoDetectedForActivityReportObjectives,
  );

  // switch from generic tableId to nextStepId, regroup to the create, update, and delete actions.
  const resourcesToSync = {
    create: genericToActivityReportObjectiveId(filteredResources.create),
    update: genericToActivityReportObjectiveId(filteredResources.update),
    destroy: genericToActivityReportObjectiveId(filteredResources.destroy),
  };

  // Save the distinct datasets to the database.
  return syncResourcesForObjectives(resourcesToSync);
};

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportObjectivesForResourcesById = async (activityReportObjectiveId, urls) => {
  const objective = await ActivityReportObjective.findOne({
    where: { id: activityReportObjectiveId },
    include: [
      {
        model: ActivityReportObjectiveResource,
        as: 'activityReportObjectiveResources',
      },
    ],
  });

  return processActivityReportObjectivesForResources(objective, urls);
};

// -----------------------------------------------------------------------------
const getResourcesForObjectives = async (objectiveIds) => ObjectiveResource
  .findAll({
    where: { id: objectiveIds },
    include: [
      {
        model: Resource,
        as: 'resource',
      },
    ],
  });

const getResourcesForActivityReportObjectives = async (
  objectiveIds,
) => ActivityReportObjectiveResource
  .findAll({
    where: { id: objectiveIds },
    include: [
      {
        model: Resource,
        as: 'resource',
      },
    ],
  });

export {
  // Resource Table
  findOrCreateResource,
  findOrCreateResources,
  // Helper functions
  calculateIsAutoDetected,
  collectURLsFromField,
  resourcesFromField,
  transformRecordByURLToResource,
  filterResourcesForSync,
  // ActivityReports Resource Processing
  calculateIsAutoDetectedForActivityReports,
  syncResourcesForActivityReport,
  activityReportIdToGeneric,
  genericToActivityReportId,
  processActivityReportForResources,
  processActivityReportForResourcesById,
  // NextSteps Resource Processing
  calculateIsAutoDetectedForNextSteps,
  nextStepIdToGeneric,
  genericToNextStepId,
  syncResourcesForNextSteps,
  processNextStepsForResources,
  processNextStepsForResourcesById,
  // Objective Resource processing
  calculateIsAutoDetectedForObjectives,
  objectiveIdToGeneric,
  genericToObjectiveId,
  syncResourcesForObjectives,
  processObjectivesForResources,
  processObjectivesForResourcesById,
  // ActivityReportObjective Resource Processing
  calculateIsAutoDetectedForActivityReportObjectives,
  activityReportObjectiveIdToGeneric,
  genericToActivityReportObjectiveId,
  syncResourcesForActivityReportObjectives,
  processActivityReportObjectivesForResources,
  processActivityReportObjectivesForResourcesById,

  getResourcesForObjectives,
  getResourcesForActivityReportObjectives,
};
