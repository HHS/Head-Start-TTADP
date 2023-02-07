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
  GoalTemplate,
  GoalTemplateResource,
  NextStep,
  NextStepResource,
  Objective,
  ObjectiveResource,
  ObjectiveTemplate,
  ObjectiveTemplateResource,
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

const GOALTEMPLATE_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.GOALTEMPLATE.NAME,
];

const REPORTGOAL_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.REPORTGOAL.NAME,
  SOURCE_FIELD.REPORTGOAL.TIMEFRAME,
];

const OBJECTIVE_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.OBJECTIVE.TITLE,
];

const OBJECTIVETEMPLATE_AUTODETECTED_FIELDS = [
  SOURCE_FIELD.OBJECTIVETEMPLATE.TITLE,
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
        && typeof resource.resourceId === 'number'
        && resource.resourceId === parseInt(resource.resourceId, 10)
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
      .map(({ url, ...resource }) => ({
        ...resource,
        resourceId: resources.find((r) => r.url === url)?.id,
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
    }));
  // Remove the records of the delta dataset from the expanded dataset.
  resourceActions.expanded = newExpandedResources.expanded
    ?.filter((neResource) => resourceActions.delta
      .filter((dResource) => dResource.genericId === neResource.genericId
        && dResource.resourceId === neResource.resourceId)
      .length === 0)
    .map((resource) => ({
      ...resource,
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
        sourceFields: { [Op.contains]: 'resource' },
      },
      include: [
        {
          model: Resource,
          as: 'resource',
        },
      ],
    }));

// Generic method for running the processFunction for an entity based on the data found at
// the passed id
const genericProcessEntityForResourcesById = async (
  tableModel,
  resourceTableModel,
  resourceTableAs,
  processFunction,
  id,
  urls,
  resourceIds,
) => {
  const entity = await tableModel.findOne({
    where: { id },
    include: [{
      model: resourceTableModel,
      as: resourceTableAs,
    }],
  });

  return entity
    && typeof entity === 'object'
    ? processFunction(entity, urls, resourceIds)
    : Promise.resolve();
};

// Generic method for processing for tan entity based on the passed data
const genericProcessEntityForResources = async (
  resourceTableModel,
  resourceTableAs,
  resourceTableForeignKey,
  columns,
  syncFunction,
  entity,
  urls,
  resourceIds,
) => {
  // Either used the current resource data from the entity passed in or look it up.
  const currentResources = entity[resourceTableAs]
    ? entity[resourceTableAs]
    : await resourceTableModel.findAll({
      where: { [resourceTableForeignKey]: entity.id },
      raw: true,
    });

  // convert to generic genericId to use generic modifier methods
  const currentResourcesGeneric = remapAttributes(currentResources, resourceTableForeignKey, 'genericId');

  // Use regex to pull urls from the required fields
  const urlsFrom = {};
  columns.forEach((column) => { urlsFrom[column] = collectURLsFromField(entity[column]); });
  urlsFrom.resource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

  // Create an array of resource objects from the passed resourceIds
  const incomingResourcesById = resourceIds && Array.isArray(resourceIds)
    ? resourceIds.map((resourceId) => ({
      genericId: entity.id,
      resourceId,
      sourceFields: ['resource'],
    }))
    : [];

  // Find or create resources for each of the urls collected.
  // Create an array of resource objects from all the data collected for the field.
  let urlsFromFlat = [];
  let incomingResourcesRaw = [];
  Object.keys(urlsFrom).forEach((key) => {
    urlsFromFlat = urlsFromFlat.concat(urlsFrom[key]);
    incomingResourcesRaw = incomingResourcesRaw.concat(resourcesFromField(
      entity.id,
      urlsFrom[key],
      key,
    ));
  });
  const resourcesWithId = await findOrCreateResources([...new Set(urlsFromFlat)]);

  // Merge all the records that share the same url and genericId, collecting all
  // the sourceFields they are from.
  const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

  // Replace the url with the associated resourceId.
  const incomingResourcesTransformed = transformRecordByURLToResource(
    incomingResourcesMerged,
    resourcesWithId,
  );

  // Merge in the passed resources from resourceIds
  const incomingResources = mergeRecordsByResourceIdAndGenericId([
    ...incomingResourcesTransformed,
    ...incomingResourcesById,
  ]);

  // filter the intersection of the incomingResources and currentResources into distinct datasets.
  const filteredResources = filterResourcesForSync(
    incomingResources,
    currentResourcesGeneric,
  );

  // switch from generic genericId to activityReportObjectiveId.
  const resourcesToSync = {
    create: remapAttributes(filteredResources.create, 'genericId', resourceTableForeignKey),
    update: remapAttributes(filteredResources.update, 'genericId', resourceTableForeignKey),
    destroy: remapAttributes(filteredResources.destroy, 'genericId', resourceTableForeignKey),
  };

  // Save the distinct datasets to the database.
  await syncFunction(resourcesToSync);
  return getResourcesForModel(
    resourceTableModel,
    entity.id,
    true,
  );
};

// Generic sync for resources
const genericSyncResourcesForEntity = async (
  resourceTableModel,
  resourceTableForeignKey,
  resources,
) => Promise.all([
  ...resources.create.map(async (resource) => resourceTableModel.create({
    [resourceTableForeignKey]: resource[resourceTableForeignKey],
    resourceId: resource.resourceId,
    sourceFields: resource.sourceFields,
  })),
  ...resources.update.map(async (resource) => resourceTableModel.update(
    {
      sourceFields: resource.sourceFields,
    },
    {
      where: {
        [resourceTableForeignKey]: resource[resourceTableForeignKey],
        resourceId: resource.resourceId,
      },
      individualHooks: true,
    },
  )),
  ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
    ? resourceTableModel.destroy({
      where: {
        [resourceTableForeignKey]: resource[resourceTableForeignKey],
        resourceId: { [Op.in]: resource.resourceIds },
      },
      individualHooks: true,
    })
    : Promise.resolve())),
]);
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
const syncResourcesForActivityReport = async (
  resources,
) => genericSyncResourcesForEntity(
  ActivityReportResource,
  'activityReportId',
  resources,
);
// const syncResourcesForActivityReport = async (resources) => Promise.all([
//   ...resources.create.map(async (resource) => ActivityReportResource.create({
//     activityReportId: resource.activityReportId,
//     resourceId: resource.resourceId,
//     sourceFields: resource.sourceFields,
//     isAutoDetected: resource.isAutoDetected,
//   })),
//   ...resources.update.map(async (resource) => ActivityReportResource.update(
//     {
//       sourceFields: resource.sourceFields,
//       isAutoDetected: resource.isAutoDetected,
//     },
//     {
//       where: {
//         activityReportId: resource.activityReportId,
//         resourceId: resource.resourceId,
//       },
//       individualHooks: true,
//     },
//   )),
//   ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
//     ? ActivityReportResource.destroy({
//       where: {
//         activityReportId: resource.activityReportId,
//         resourceId: { [Op.in]: resource.resourceIds },
//       },
//       individualHooks: true,
//     })
//     : Promise.resolve())),
// ]);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportForResources = async (
  activityReport,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  ActivityReportResource,
  'activityReportResources',
  'activityReportId',
  REPORT_AUTODETECTED_FIELDS,
  syncResourcesForActivityReport,
  activityReport,
  urls,
  resourceIds,
);
// const processActivityReportForResources = async (activityReport, urls) => {
//   // Either used the current resource data from the activityReport passed in or look it up.
//   const currentResources = activityReport.activityReportResources
//     ? activityReport.activityReportResources
//     : await ActivityReportResource.findAll({
//       where: { activityReportId: activityReport.id },
//       raw: true,
//     });

//   // convert to generic genericId to use generic modifier methods
//   const currentResourcesGeneric = remapAttributes(currentResources, 'activityReportId', 'genericId');

//   // Use regex to pull urls from the required fields
//   const urlsFromECLKC = collectURLsFromField(activityReport.ECLKCResourcesUsed);
//   const urlsFromNonECLKC = collectURLsFromField(activityReport.nonECLKCResourcesUsed);
//   const urlsFromContext = collectURLsFromField(activityReport.context);
//   const urlsFromNotes = collectURLsFromField(activityReport.additionalNotes);
//   const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

//   // Find or create resources for each of the urls collected.
//   const resourcesWithId = await findOrCreateResources([...new Set([
//     ...urlsFromECLKC,
//     ...urlsFromNonECLKC,
//     ...urlsFromContext,
//     ...urlsFromNotes,
//     ...urlsFromResource,
//   ])]);

//   // Create an array of resource objects from all the data collected for each of the fields.
//   const incomingResourcesRaw = [
//     ...resourcesFromField(
//       activityReport.id,
//       urlsFromECLKC,
//       SOURCE_FIELD.REPORT.ECLKC,
//     ),
//     ...resourcesFromField(
//       activityReport.id,
//       urlsFromNonECLKC,
//       SOURCE_FIELD.REPORT.NONECLKC,
//     ),
//     ...resourcesFromField(
//       activityReport.id,
//       urlsFromContext,
//       SOURCE_FIELD.REPORT.CONTEXT,
//     ),
//     ...resourcesFromField(
//       activityReport.id,
//       urlsFromNotes,
//       SOURCE_FIELD.REPORT.NOTES,
//     ),
//     ...resourcesFromField(
//       activityReport.id,
//       urlsFromResource,
//       SOURCE_FIELD.REPORT.RESOURCE,
//     ),
//   ];

//   // Merge all the records that share the same url and genericId, collecting all
//   // the sourceFields they are from.
//   const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

//   // Replace the url with the associated resourceId.
//   const incomingResourcesTransformed = transformRecordByURLToResource(
//     incomingResourcesMerged,
//     resourcesWithId,
//   );

//   // filter the intersection of the incomingResources and currentResources into distinct datasets.
//   const filteredResources = filterResourcesForSync(
//     incomingResourcesTransformed,
//     currentResourcesGeneric,
//   );

//   // switch from generic genericId to activityReportId.
//   const resourcesToSync = {
//     create: remapAttributes(filteredResources.create, 'genericId', 'activityReportId'),
//     update: remapAttributes(filteredResources.update, 'genericId', 'activityReportId'),
//     destroy: remapAttributes(filteredResources.destroy, 'genericId', 'activityReportId'),
//   };

//   // Save the distinct datasets to the database.
//   await syncResourcesForActivityReport(resourcesToSync);
//   return getResourcesForModel(
//     ActivityReportResource,
//     activityReport.id,
//     true,
//   );
// };

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportForResourcesById = async (
  activityReportId,
  urls,
) => genericProcessEntityForResourcesById(
  ActivityReport,
  ActivityReportResource,
  'activityReportResources',
  processActivityReportForResources,
  activityReportId,
  urls,
  [],
);

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
const syncResourcesForNextStep = async (
  resources,
) => genericSyncResourcesForEntity(
  NextStepResource,
  'nextStepId',
  resources,
);
// const syncResourcesForNextStep = async (resources) => Promise.all([
//   ...resources.create.map(async (resource) => NextStepResource.create({
//     nextStepId: resource.nextStepId,
//     resourceId: resource.resourceId,
//     sourceFields: resource.sourceFields,
//     isAutoDetected: resource.isAutoDetected,
//   })),
//   ...resources.update.map(async (resource) => NextStepResource.update(
//     {
//       sourceFields: resource.sourceFields,
//       isAutoDetected: resource.isAutoDetected,
//     },
//     {
//       where: {
//         nextStepId: resource.nextStepId,
//         resourceId: resource.resourceId,
//       },
//       individualHooks: true,
//     },
//   )),
//   ...resources.destroy.map(async (resource) => (resource.resourceIds.length > 0
//     ? NextStepResource.destroy({
//       where: {
//         nextStepId: resource.nextStepId,
//         resourceId: { [Op.in]: resource.resourceIds },
//       },
//       individualHooks: true,
//     })
//     : Promise.resolve())),
// ]);

// Process the current values on the report into the database for all referenced resources.
const processNextStepForResources = async (
  nextStep,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  NextStepResource,
  'nextStepResources',
  'nextStepId',
  NEXTSTEP_AUTODETECTED_FIELDS,
  syncResourcesForNextStep,
  nextStep,
  urls,
  resourceIds,
);
// const processNextStepForResources = async (nextStep, urls) => {
//   // Either used the current resource data from the nextStep passed in or look it up.
//   const currentResources = nextStep.nextStepResources
//     ? nextStep.nextStepResources
//     : await NextStepResource.findAll({
//       where: { nextStepId: nextStep.id },
//       raw: true,
//     });

//   // convert to generic genericId to use generic modifier methods
//   const currentResourcesGeneric = remapAttributes(currentResources, 'nextStepId', 'genericId');

//   // Use regex to pull urls from the required fields
//   const urlsFromNote = collectURLsFromField(nextStep.note);
//   const urlsFromResource = urls.map((url) => collectURLsFromField(url)).flat(Infinity);

//   // Find or create resources for each of the urls collected.
//   const resourcesWithId = await findOrCreateResources([...new Set([
//     ...urlsFromNote,
//     ...urlsFromResource,
//   ])]);

//   // Create an array of resource objects from all the data collected for the field.
//   const incomingResourcesRaw = [
//     ...resourcesFromField(
//       nextStep.id,
//       urlsFromNote,
//       SOURCE_FIELD.NEXTSTEPS.NOTE,
//     ),
//     ...resourcesFromField(
//       nextStep.id,
//       urlsFromResource,
//       SOURCE_FIELD.NEXTSTEPS.RESOURCE,
//     ),
//   ];

//   // Merge all the records that share the same url and genericId, collecting all
//   // the sourceFields they are from.
//   const incomingResourcesMerged = mergeRecordsByUrlAndGenericId(incomingResourcesRaw);

//   // Replace the url with the associated resourceId.
//   const incomingResourcesTransformed = transformRecordByURLToResource(
//     incomingResourcesMerged,
//     resourcesWithId,
//   );

//   // filter the intersection of the incomingResources and currentResources into distinct datasets.
//   const filteredResources = filterResourcesForSync(
//     incomingResourcesTransformed,
//     currentResourcesGeneric,
//   );

//   // switch from generic genericId to nextStepId.
//   const resourcesToSync = {
//     create: remapAttributes(filteredResources.create, 'genericId', 'nextStepId'),
//     update: remapAttributes(filteredResources.update, 'genericId', 'nextStepId'),
//     destroy: remapAttributes(filteredResources.destroy, 'genericId', 'nextStepId'),
//   };

//   // Save the distinct datasets to the database.
//   await syncResourcesForNextStep(resourcesToSync);
//   return getResourcesForModel(
//     NextStepResource,
//     nextStep.id,
//   );
// };

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processNextStepForResourcesById = async (
  nextStepId,
  urls,
) => genericProcessEntityForResourcesById(
  NextStep,
  NextStepResource,
  'nextStepResources',
  processNextStepForResources,
  nextStepId,
  urls,
);

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
const syncResourcesForGoal = async (
  resources,
) => genericSyncResourcesForEntity(
  GoalResource,
  'goalId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processGoalForResources = async (
  goal,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  GoalResource,
  'goalResources',
  'goalId',
  GOAL_AUTODETECTED_FIELDS,
  syncResourcesForGoal,
  goal,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processGoalForResourcesById = async (
  goalId,
  urls,
) => genericProcessEntityForResourcesById(
  Goal,
  GoalResource,
  'goalResources',
  processGoalForResources,
  goalId,
  urls,
);

// -----------------------------------------------------------------------------
// Goal Template Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.GOAL
// and log exceptions
const calculateIsAutoDetectedForGoalTemplate = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, GOALTEMPLATE_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForGoalTemplate = async (
  resources,
) => genericSyncResourcesForEntity(
  GoalTemplateResource,
  'goalTemplateId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processGoalTemplateForResources = async (
  goalTemplate,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  GoalTemplateResource,
  'goalTemplateResources',
  'goalTemplateId',
  GOALTEMPLATE_AUTODETECTED_FIELDS,
  syncResourcesForGoalTemplate,
  goalTemplate,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processGoalTemplateForResourcesById = async (
  goalTemplateId,
  urls,
) => genericProcessEntityForResourcesById(
  GoalTemplate,
  GoalTemplateResource,
  'goalTemplateResources',
  processGoalTemplateForResources,
  goalTemplateId,
  urls,
);

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
const syncResourcesForActivityReportGoal = async (
  resources,
) => genericSyncResourcesForEntity(
  ActivityReportGoalResource,
  'activityReportGoalId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportGoalForResources = async (
  activityReportGoal,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  ActivityReportGoal,
  'activityReportGoalResources',
  'activityReportGoalId',
  REPORTGOAL_AUTODETECTED_FIELDS,
  syncResourcesForActivityReportGoal,
  activityReportGoal,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportGoalForResourcesById = async (
  activityReportGoalId,
  urls,
) => genericProcessEntityForResourcesById(
  ActivityReportGoal,
  ActivityReportGoalResource,
  'activityReportGoalResources',
  processActivityReportGoalForResources,
  activityReportGoalId,
  urls,
);

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
const syncResourcesForObjective = async (
  resources,
) => genericSyncResourcesForEntity(
  ObjectiveResource,
  'objectiveId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processObjectiveForResources = async (
  objective,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  ObjectiveResource,
  'objectiveResources',
  'objectiveId',
  OBJECTIVE_AUTODETECTED_FIELDS,
  syncResourcesForObjective,
  objective,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processObjectiveForResourcesById = async (
  objectiveId,
  urls,
) => genericProcessEntityForResourcesById(
  Objective,
  ObjectiveResource,
  'objectiveResources',
  processObjectiveForResources,
  objectiveId,
  urls,
);

// -----------------------------------------------------------------------------
// Objectives Tamplate Resource Processing
// -----------------------------------------------------------------------------
// Identify if passed sourceFields contain one or more of the NEXTSTEPS_AUTODETECTED_FIELDS.
// TODO: verify all values in the sourceFields are in SOURCE_FIELD.OBJECTIVES
// and log exceptions
const calculateIsAutoDetectedForObjectiveTemplate = (
  sourceFields,
) => calculateIsAutoDetected(sourceFields, OBJECTIVETEMPLATE_AUTODETECTED_FIELDS);

// Using the three dataset, each can be run in "parallel" to reduce latency when applied to the
// database. This should result in better performance.
const syncResourcesForObjectiveTemplate = async (
  resources,
) => genericSyncResourcesForEntity(
  ObjectiveTemplateResource,
  'objectiveTemplateId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processObjectiveTemplateForResources = async (
  objectiveTemplate,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  ObjectiveTemplateResource,
  'objectiveTemplateResources',
  'objectiveTemplateId',
  OBJECTIVETEMPLATE_AUTODETECTED_FIELDS,
  syncResourcesForObjectiveTemplate,
  objectiveTemplate,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processObjectiveTemplateForResourcesById = async (
  objectiveTemplateId,
  urls,
) => genericProcessEntityForResourcesById(
  ObjectiveTemplate,
  ObjectiveTemplateResource,
  'objectiveTemplateResources',
  processObjectiveTemplateForResources,
  objectiveTemplateId,
  urls,
);

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
const syncResourcesForActivityReportObjective = async (
  resources,
) => genericSyncResourcesForEntity(
  ActivityReportObjectiveResource,
  'activityReportObjectiveId',
  resources,
);

// Process the current values on the report into the database for all referenced resources.
const processActivityReportObjectiveForResources = async (
  activityReportObjective,
  urls,
  resourceIds,
) => genericProcessEntityForResources(
  ActivityReportObjectiveResource,
  'activityReportObjectiveResources',
  'activityReportObjectiveId',
  REPORTOBJECTIVE_AUTODETECTED_FIELDS,
  syncResourcesForActivityReportObjective,
  activityReportObjective,
  urls,
  resourceIds,
);

// Process the current values on the report into the database for all referenced resources for
// the reportId passed.
const processActivityReportObjectiveForResourcesById = async (
  activityReportObjectiveId,
  urls,
) => genericProcessEntityForResourcesById(
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  'activityReportObjectiveResources',
  processActivityReportObjectiveForResources,
  activityReportObjectiveId,
  urls,
);

// -----------------------------------------------------------------------------
const getResourcesForActivityReports = async (
  reportIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ActivityReportResource,
  reportIds,
  includeAutoDetected,
);

const getResourcesForNextSteps = async (
  nextStepIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  NextStepResource,
  nextStepIds,
  includeAutoDetected,
);

const getResourcesForGoals = async (
  goalIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  GoalResource,
  goalIds,
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
  includeAutoDetected,
);

const getResourcesForActivityReportObjectives = async (
  objectiveIds,
  includeAutoDetected = false,
) => getResourcesForModel(
  ActivityReportObjectiveResource,
  objectiveIds,
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
  genericProcessEntityForResourcesById,
  genericProcessEntityForResources,
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
