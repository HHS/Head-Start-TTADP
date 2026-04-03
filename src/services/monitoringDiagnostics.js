import { Op } from 'sequelize';
import db from '../models';

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function reviewNameWhere(tableAlias, reviewIdColumn, reviewName) {
  if (!reviewName || typeof reviewName !== 'string' || !reviewName.trim()) {
    return null;
  }

  const escapedReviewName = db.sequelize.escape(`%${escapeLike(reviewName.trim())}%`);

  return db.sequelize.where(
    db.sequelize.literal(`EXISTS (
      SELECT 1
      FROM "MonitoringReviews" mr
      WHERE mr."reviewId" = "${tableAlias}"."${reviewIdColumn}"
        AND mr.name ILIKE ${escapedReviewName} ESCAPE '\\'
    )`),
    true,
  );
}

function monitoringFindingStatusNameLiteral(tableAlias) {
  return db.sequelize.literal(`(
    SELECT mfs.name
    FROM "MonitoringFindingStatuses" mfs
    WHERE mfs."statusId" = "${tableAlias}"."statusId"
      AND mfs."deletedAt" IS NULL
    ORDER BY
      mfs."sourceUpdatedAt" DESC NULLS LAST,
      mfs.id DESC
    LIMIT 1
  )`);
}

function monitoringFindingHistoryStatusNameLiteral(tableAlias) {
  return db.sequelize.literal(`(
    SELECT mfhs.name
    FROM "MonitoringFindingHistoryStatuses" mfhs
    WHERE mfhs."statusId" = "${tableAlias}"."statusId"
      AND mfhs."deletedAt" IS NULL
    ORDER BY
      mfhs."sourceUpdatedAt" DESC NULLS LAST,
      mfhs.id DESC
    LIMIT 1
  )`);
}

function monitoringReviewStatusNameLiteral(tableAlias) {
  return db.sequelize.literal(`(
    SELECT mrs.name
    FROM "MonitoringReviewStatuses" mrs
    WHERE mrs."statusId" = "${tableAlias}"."statusId"
      AND mrs."deletedAt" IS NULL
    ORDER BY
      mrs."sourceUpdatedAt" DESC NULLS LAST,
      mrs.id DESC
    LIMIT 1
  )`);
}

export const MONITORING_DIAGNOSTIC_RESOURCES = {
  citations: {
    modelName: 'Citation',
    buildWhere: (filter) => reviewNameWhere('Citation', 'latest_review_uuid', filter.reviewName),
  },
  grantCitations: {
    modelName: 'GrantCitation',
  },
  deliveredReviews: {
    modelName: 'DeliveredReview',
    buildWhere: (filter) => reviewNameWhere('DeliveredReview', 'review_uuid', filter.reviewName),
  },
  deliveredReviewCitations: {
    modelName: 'DeliveredReviewCitation',
  },
  grantDeliveredReviews: {
    modelName: 'GrantDeliveredReview',
  },
  monitoringReviews: {
    modelName: 'MonitoringReview',
    queryOptions: {
      attributes: {
        include: [
          [monitoringReviewStatusNameLiteral('MonitoringReview'), 'statusName'],
        ],
      },
    },
  },
  monitoringReviewGrantees: {
    modelName: 'MonitoringReviewGrantee',
    buildWhere: (filter) => reviewNameWhere('MonitoringReviewGrantee', 'reviewId', filter.reviewName),
  },
  monitoringFindings: {
    modelName: 'MonitoringFinding',
    queryOptions: {
      attributes: {
        include: [
          [monitoringFindingStatusNameLiteral('MonitoringFinding'), 'statusName'],
        ],
      },
    },
  },
  monitoringFindingHistories: {
    modelName: 'MonitoringFindingHistory',
    queryOptions: {
      attributes: {
        include: [
          [monitoringFindingHistoryStatusNameLiteral('MonitoringFindingHistory'), 'statusName'],
        ],
      },
    },
    buildWhere: (filter) => reviewNameWhere('MonitoringFindingHistory', 'reviewId', filter.reviewName),
  },
  monitoringFindingGrants: {
    modelName: 'MonitoringFindingGrant',
    queryOptions: {
      attributes: {
        include: [
          [monitoringFindingStatusNameLiteral('MonitoringFindingGrant'), 'statusName'],
        ],
      },
    },
  },
  monitoringFindingStandards: {
    modelName: 'MonitoringFindingStandard',
  },
  monitoringStandards: {
    modelName: 'MonitoringStandard',
  },
  monitoringGoals: {
    modelName: 'Goal',
    queryOptions: {
      distinct: true,
      include: [
        {
          model: db.GoalTemplate,
          as: 'goalTemplate',
          required: true,
          attributes: ['id', 'templateName', 'standard'],
          where: {
            standard: 'Monitoring',
          },
        },
      ],
    },
  },
  goalStatusChanges: {
    modelName: 'GoalStatusChange',
  },
  grantRelationshipToActive: {
    modelName: 'GrantRelationshipToActive',
  },
};

function getResourceConfig(resource) {
  const config = MONITORING_DIAGNOSTIC_RESOURCES[resource];
  if (!config) {
    throw new Error(`Unsupported monitoring diagnostic resource: ${resource}`);
  }

  return config;
}

function getModel(resource) {
  const { modelName } = getResourceConfig(resource);
  if (!modelName || !db[modelName]) {
    throw new Error(`Unsupported monitoring diagnostic resource: ${resource}`);
  }

  return db[modelName];
}

function sanitizeFilter(model, filter = {}) {
  return Object.entries(filter).reduce((accumulator, [key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(model.rawAttributes, key)) {
      return accumulator;
    }

    if (value === null || value === undefined || value === '') {
      return accumulator;
    }

    const typeKey = model.rawAttributes[key]?.type?.key;

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return accumulator;
      }

      if (['STRING', 'TEXT'].includes(typeKey)) {
        return {
          ...accumulator,
          [key]: {
            [Op.iLike]: `%${escapeLike(trimmedValue)}%`,
          },
        };
      }

      return {
        ...accumulator,
        [key]: trimmedValue,
      };
    }

    return {
      ...accumulator,
      [key]: value,
    };
  }, {});
}

function buildWhere(parsedFilter, additionalWhere) {
  if (!additionalWhere) {
    return parsedFilter;
  }

  if (!Object.keys(parsedFilter).length) {
    return additionalWhere;
  }

  return {
    [Op.and]: [
      parsedFilter,
      additionalWhere,
    ],
  };
}

function parseJsonParam(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function sanitizeSort(model, sort = '["id","ASC"]') {
  const [field = 'id', direction = 'ASC'] = parseJsonParam(sort, ['id', 'ASC']);
  const safeField = Object.prototype.hasOwnProperty.call(model.rawAttributes, field) ? field : 'id';
  const safeDirection = String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return [safeField, safeDirection];
}

export async function monitoringDiagnostics(
  resource,
  { filter = '{}', range = '[0,9]', sort = '["id","ASC"]' } = {},
) {
  const model = getModel(resource);
  const rawFilter = parseJsonParam(filter, {});
  const parsedFilter = sanitizeFilter(model, rawFilter);
  const [start = 0, end = 9] = parseJsonParam(range, [0, 9]);
  const limit = Math.max((end - start) + 1, 0);
  const offset = Math.max(start, 0);
  const order = sanitizeSort(model, sort);
  const { queryOptions = {}, buildWhere: buildResourceWhere } = getResourceConfig(resource);
  const resourceWhere = buildResourceWhere ? buildResourceWhere(rawFilter) : null;

  return model.findAndCountAll({
    ...queryOptions,
    where: buildWhere(buildWhere(parsedFilter, queryOptions.where), resourceWhere),
    order: [order],
    offset,
    limit,
  });
}

export async function monitoringDiagnosticById(resource, id) {
  const model = getModel(resource);
  const { queryOptions = {} } = getResourceConfig(resource);

  return model.findOne({
    ...queryOptions,
    where: buildWhere({ id }, queryOptions.where),
  });
}
