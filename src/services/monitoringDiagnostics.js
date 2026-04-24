import { Op } from 'sequelize';
import db from '../models';

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

const INTEGER_TYPE_KEYS = ['INTEGER', 'BIGINT'];
const INTEGER_FILTER_PATTERN = /^-?\d+$/;

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
    const isIntegerFilter = INTEGER_TYPE_KEYS.includes(typeKey);

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

      if (isIntegerFilter) {
        if (!INTEGER_FILTER_PATTERN.test(trimmedValue)) {
          return accumulator;
        }

        return {
          ...accumulator,
          [key]: typeKey === 'BIGINT' ? trimmedValue : Number(trimmedValue),
        };
      }

      return {
        ...accumulator,
        [key]: trimmedValue,
      };
    }

    if (Array.isArray(value) || typeof value === 'object') {
      return accumulator;
    }

    if (isIntegerFilter && !Number.isInteger(value)) {
      return accumulator;
    }

    return {
      ...accumulator,
      [key]: value,
    };
  }, {});
}

function sanitizeAuxiliaryFilter(filter = {}) {
  const auxiliaryFilter = {};

  if (typeof filter.reviewName === 'string') {
    const reviewName = filter.reviewName.trim();
    if (reviewName) {
      auxiliaryFilter.reviewName = reviewName;
    }
  }

  if (typeof filter.deletedStatus === 'string') {
    const deletedStatus = filter.deletedStatus.trim().toLowerCase();
    if (['active', 'deleted', 'all'].includes(deletedStatus)) {
      auxiliaryFilter.deletedStatus = deletedStatus;
    }
  }

  if (typeof filter.sourceDeletedStatus === 'string') {
    const sourceDeletedStatus = filter.sourceDeletedStatus.trim().toLowerCase();
    if (['active', 'deleted', 'all'].includes(sourceDeletedStatus)) {
      auxiliaryFilter.sourceDeletedStatus = sourceDeletedStatus;
    }
  }

  return auxiliaryFilter;
}

function hasWhereClause(clause) {
  return Boolean(
    clause
    && (Object.keys(clause).length > 0 || Object.getOwnPropertySymbols(clause).length > 0),
  );
}

function combineWhereClauses(...clauses) {
  const normalizedClauses = clauses.flatMap((clause) => {
    if (!hasWhereClause(clause)) {
      return [];
    }

    if (
      Object.keys(clause).length === 0
      && Object.getOwnPropertySymbols(clause).length === 1
      && Array.isArray(clause[Op.and])
    ) {
      return clause[Op.and].filter(hasWhereClause);
    }

    return [clause];
  });

  if (!normalizedClauses.length) {
    return {};
  }

  if (normalizedClauses.length === 1) {
    return normalizedClauses[0];
  }

  return {
    [Op.and]: normalizedClauses,
  };
}

function isParanoidModel(model) {
  return Boolean(model?.options?.paranoid && Object.prototype.hasOwnProperty.call(model.rawAttributes, 'deletedAt'));
}

function hasSourceDeletedAt(model) {
  return Boolean(Object.prototype.hasOwnProperty.call(model.rawAttributes, 'sourceDeletedAt'));
}

function deletedStatusWhere(model, filter = {}) {
  if (!isParanoidModel(model)) {
    return null;
  }

  const deletedStatus = typeof filter.deletedStatus === 'string'
    ? filter.deletedStatus.trim().toLowerCase()
    : '';
  const sourceDeletedStatus = typeof filter.sourceDeletedStatus === 'string'
    ? filter.sourceDeletedStatus.trim().toLowerCase()
    : '';

  // Source-deleted diagnostics should include app-active and app-deleted rows unless
  // the deleted status filter explicitly narrows the result.
  if (hasSourceDeletedAt(model) && sourceDeletedStatus === 'deleted' && (!deletedStatus || deletedStatus === 'active')) {
    return null;
  }

  if (deletedStatus === 'all') {
    return null;
  }

  if (deletedStatus === 'deleted') {
    return {
      deletedAt: {
        [Op.ne]: null,
      },
    };
  }

  return {
    deletedAt: null,
  };
}

function sourceDeletedStatusWhere(model, filter = {}) {
  if (!hasSourceDeletedAt(model)) {
    return null;
  }

  const sourceDeletedStatus = typeof filter.sourceDeletedStatus === 'string'
    ? filter.sourceDeletedStatus.trim().toLowerCase()
    : '';

  if (sourceDeletedStatus === 'all' || !sourceDeletedStatus) {
    return null;
  }

  if (sourceDeletedStatus === 'deleted') {
    return {
      sourceDeletedAt: {
        [Op.ne]: null,
      },
    };
  }

  return {
    sourceDeletedAt: null,
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
  const parsedSort = parseJsonParam(sort, ['id', 'ASC']);
  const [field = 'id', direction = 'ASC'] = Array.isArray(parsedSort)
    ? parsedSort
    : ['id', 'ASC'];
  const safeField = Object.prototype.hasOwnProperty.call(model.rawAttributes, field) ? field : 'id';
  const safeDirection = String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return [safeField, safeDirection];
}

function sanitizeRange(range = '[0,9]') {
  const parsedRange = parseJsonParam(range, [0, 9]);
  const [rawStart = 0, rawEnd = 9] = Array.isArray(parsedRange)
    ? parsedRange
    : [0, 9];
  const startNumber = Number(rawStart);
  const endNumber = Number(rawEnd);
  const start = Number.isFinite(startNumber) ? Math.trunc(startNumber) : 0;
  const end = Number.isFinite(endNumber) ? Math.trunc(endNumber) : 9;

  return [start, end];
}

export async function monitoringDiagnostics(
  resource,
  { filter = '{}', range = '[0,9]', sort = '["id","ASC"]' } = {},
) {
  const model = getModel(resource);
  const rawFilter = parseJsonParam(filter, {});
  const parsedFilter = sanitizeFilter(model, rawFilter);
  const auxiliaryFilter = sanitizeAuxiliaryFilter(rawFilter);
  const [start, end] = sanitizeRange(range);
  const limit = Math.min(Math.max((end - start) + 1, 0), 1000);
  const offset = Math.max(start, 0);
  const order = sanitizeSort(model, sort);
  const { queryOptions = {}, buildWhere: buildResourceWhere } = getResourceConfig(resource);
  const resourceWhere = buildResourceWhere ? buildResourceWhere(auxiliaryFilter) : null;
  const paranoidQueryOptions = isParanoidModel(model) ? { paranoid: false } : {};
  const deletedWhere = deletedStatusWhere(model, auxiliaryFilter);
  const sourceDeletedWhere = sourceDeletedStatusWhere(model, auxiliaryFilter);

  return model.findAndCountAll({
    ...paranoidQueryOptions,
    ...queryOptions,
    where: combineWhereClauses(
      parsedFilter,
      queryOptions.where,
      resourceWhere,
      deletedWhere,
      sourceDeletedWhere,
    ),
    order: [order],
    offset,
    limit,
  });
}

export async function monitoringDiagnosticById(resource, id) {
  const model = getModel(resource);
  const { queryOptions = {} } = getResourceConfig(resource);
  const paranoidQueryOptions = isParanoidModel(model) ? { paranoid: false } : {};

  return model.findOne({
    ...paranoidQueryOptions,
    ...queryOptions,
    where: combineWhereClauses({ id }, queryOptions.where),
  });
}
