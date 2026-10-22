import cls from 'cls-hooked';
import httpContext from 'express-http-context';
import { QueryTypes } from 'sequelize';
import { GOAL_COLLABORATORS, GROUP_COLLABORATORS, OBJECTIVE_COLLABORATORS } from '../../constants';
import createOrFindExisting from '../../lib/createOrFindExisting';

const collaboratorDetails = {
  goal: {
    idName: 'goalId',
    validFor: 'Goals',
    collaborators: 'GoalCollaborator',
    collaboratorTable: 'GoalCollaborators',
    reportLinks: {
      model: 'GoalCollaboratorActivityReport',
      table: 'GoalCollaboratorActivityReports',
      collaboratorIdName: 'goalCollaboratorId',
    },
    creator: GOAL_COLLABORATORS.CREATOR,
    editor: GOAL_COLLABORATORS.EDITOR,
  },
  objective: {
    idName: 'objectiveId',
    validFor: 'Objectives',
    collaborators: 'ObjectiveCollaborator',
    collaboratorTable: 'ObjectiveCollaborators',
    reportLinks: {
      model: 'ObjectiveCollaboratorActivityReport',
      table: 'ObjectiveCollaboratorActivityReports',
      collaboratorIdName: 'objectiveCollaboratorId',
    },
    creator: OBJECTIVE_COLLABORATORS.CREATOR,
    editor: OBJECTIVE_COLLABORATORS.EDITOR,
  },
  group: {
    idName: 'groupId',
    validFor: 'Groups',
    collaborators: 'GroupCollaborator',
    collaboratorTable: 'GroupCollaborators',
    reportLinks: null,
    creator: GROUP_COLLABORATORS.CREATOR,
    editor: GROUP_COLLABORATORS.EDITOR,
  },
};

// Largest value of a Postgres `int`, the type of ActivityReports.id.
const MAX_REPORT_ID = 2147483647;

// Callers pass `{ activityReportIds: [...] }` to tie a collaborator to the reports it came from.
// Only ids that fit a report id are kept, which also keeps the raw SQL below safe to
// parameterize and its `::int[]` cast from failing.
const activityReportIdsFrom = (linkBack) => [
  ...new Set(
    (Array.isArray(linkBack?.activityReportIds) ? linkBack.activityReportIds : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0 && id <= MAX_REPORT_ID)
  ),
];

// Runs `work` in the caller's transaction (passed or ambient), or in a new one when there's
// none, so its statements always commit or roll back together. Not a nested transaction: that
// would be a savepoint, which sibling calls sharing the caller's transaction can't use
// concurrently.
const inTransaction = (sequelize, transaction, work) => {
  const current = transaction || cls.getNamespace('transaction')?.get('transaction');
  if (current) return work(current);
  return sequelize.transaction(work);
};

/**
 * Finds the ID for a given collaborator type in the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object.
 * @param {string} typeName - The name of the collaborator type.
 * @returns {Promise<Object>} - A promise that resolves to the found collaborator type ID.
 */
const getIdForCollaboratorType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  typeName
  // Find the collaborator type in the database
) =>
  sequelize.models.CollaboratorType.findOne({
    where: {
      name: typeName,
    },
    include: [
      {
        model: sequelize.models.ValidFor,
        as: 'validFor',
        required: true,
        attributes: [],
        where: { name: collaboratorDetails[genericCollaboratorType].validFor },
      },
    ],
    raw: true,
    ...(transaction && { transaction }),
  });

const buildCollaboratorValues = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName
) => {
  const collaboratorType = await getIdForCollaboratorType(
    genericCollaboratorType,
    sequelize,
    transaction,
    typeName
  );

  if (!collaboratorType) {
    throw new Error(
      `No collaborator type found for "${typeName}" in ${collaboratorDetails[genericCollaboratorType].validFor}`
    );
  }

  return {
    [collaboratorDetails[genericCollaboratorType].idName]: entityId,
    userId,
    collaboratorTypeId: collaboratorType.id,
  };
};

const assertReportLinksSupported = (genericCollaboratorType) => {
  if (!collaboratorDetails[genericCollaboratorType].reportLinks) {
    throw new Error(`${genericCollaboratorType} collaborators can't be linked to activity reports`);
  }
};

/**
 * Creates a new entity collaborator in the database, linked to any activity reports in
 * `linkBack.activityReportIds`.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for atomicity.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The activity reports to link, as `{ activityReportIds: [...] }`.
 * @returns {Promise<Object>} - A Promise that resolves to the created entity collaborator.
 */
const createCollaborator = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName,
  linkBack = null
) => {
  const reportIds = activityReportIdsFrom(linkBack);
  if (reportIds.length > 0) assertReportLinksSupported(genericCollaboratorType);

  // The collaborator and its links are created together, so a failed link insert can't leave
  // behind a collaborator linked to no reports.
  return inTransaction(sequelize, transaction, async (t) => {
    const values = await buildCollaboratorValues(
      genericCollaboratorType,
      sequelize,
      t,
      entityId,
      userId,
      typeName
    );
    const collaborator = await sequelize.models[
      collaboratorDetails[genericCollaboratorType].collaborators
    ].create(values, { transaction: t });

    if (reportIds.length > 0) {
      const { model, collaboratorIdName } =
        collaboratorDetails[genericCollaboratorType].reportLinks;
      await sequelize.models[model].bulkCreate(
        reportIds.map((activityReportId) => ({
          [collaboratorIdName]: collaborator.id,
          activityReportId,
        })),
        { transaction: t }
      );
    }

    return collaborator;
  });
};

/**
 * Retrieves a entity collaborator record from the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} transaction - The transaction object.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @returns {Promise<object>} - A promise that resolves to the entity collaborator record.
 */
const getCollaboratorRecord = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName
  // Find the entity collaborator record in the database
) =>
  sequelize.models[collaboratorDetails[genericCollaboratorType].collaborators].findOne({
    where: {
      [collaboratorDetails[genericCollaboratorType].idName]: entityId,
      userId,
    },
    include: [
      {
        model: sequelize.models.CollaboratorType,
        as: 'collaboratorType',
        required: true,
        where: { name: typeName },
        attributes: ['name'],
        include: [
          {
            model: sequelize.models.ValidFor,
            as: 'validFor',
            required: true,
            attributes: [],
            where: { name: collaboratorDetails[genericCollaboratorType].validFor },
          },
        ],
      },
    ],
    ...(transaction && { transaction }),
  });

/**
 * Finds or creates a collaborator record in the database, and links it to any activity reports
 * in `linkBack.activityReportIds`.
 *
 * The partial unique index on active (entityId, userId, collaboratorTypeId) rows and the unique
 * (collaborator, report) link index keep concurrent calls from creating duplicates.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for database operations.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The activity reports to link, as `{ activityReportIds: [...] }`.
 * @returns {Promise<Object>} - The entity collaborator record.
 */
const findOrCreateCollaborator = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName,
  linkBack = null
) => {
  const { collaborators, collaboratorTable, idName, reportLinks } =
    collaboratorDetails[genericCollaboratorType];
  const reportIds = activityReportIdsFrom(linkBack);
  const findExisting = () =>
    getCollaboratorRecord(
      genericCollaboratorType,
      sequelize,
      transaction,
      entityId,
      userId,
      typeName
    );

  if (reportIds.length === 0) {
    const existing = await findExisting();
    if (existing) return existing;

    const { record } = await createOrFindExisting(
      sequelize.models[collaborators],
      await buildCollaboratorValues(
        genericCollaboratorType,
        sequelize,
        transaction,
        entityId,
        userId,
        typeName
      ),
      findExisting,
      transaction
    );
    return record;
  }

  assertReportLinksSupported(genericCollaboratorType);
  const { collaboratorTypeId } = await buildCollaboratorValues(
    genericCollaboratorType,
    sequelize,
    transaction,
    entityId,
    userId,
    typeName
  );

  // Each statement below finds or creates the active collaborator and links the reports to it
  // in one go. Separate find-then-link steps could link reports to a collaborator that a
  // removeCollaboratorsForType sharing this transaction had just deleted; as single statements,
  // any interleaving with that removal is safe. Raw SQL because Sequelize can't upsert against
  // a partial index.
  const linkReports = /* sql */ `
    linked AS (
      INSERT INTO "${reportLinks.table}" ("${reportLinks.collaboratorIdName}", "activityReportId", "createdAt", "updatedAt")
      SELECT collaborator.id, report_id, NOW(), NOW()
      FROM collaborator
      CROSS JOIN unnest(ARRAY[:reportIds]::int[]) AS report_id
      ON CONFLICT ("${reportLinks.collaboratorIdName}", "activityReportId") DO NOTHING
    )
    SELECT * FROM collaborator;
  `;
  // Locks the existing active collaborator against removals in other transactions, without
  // rewriting it, so a repeat link adds no update or audit row. FOR UPDATE rechecks the row's
  // latest committed version, so one soft-deleted by a removal this statement waited on is
  // skipped rather than linked.
  const linkExisting = /* sql */ `
    WITH collaborator AS (
      SELECT c.*
      FROM "${collaboratorTable}" c
      WHERE c."${idName}" = :entityId
        AND c."userId" = :userId
        AND c."collaboratorTypeId" = :collaboratorTypeId
        AND c."deletedAt" IS NULL
      FOR UPDATE
    ),
    ${linkReports}
  `;
  // Creates the collaborator when there's no active one. On a conflict with one created
  // concurrently, it inserts and returns nothing, and the existing one is linked on the next pass.
  const createAndLink = /* sql */ `
    WITH collaborator AS (
      INSERT INTO "${collaboratorTable}" ("${idName}", "userId", "collaboratorTypeId", "createdAt", "updatedAt")
      VALUES (:entityId, :userId, :collaboratorTypeId, NOW(), NOW())
      ON CONFLICT ("${idName}", "userId", "collaboratorTypeId") WHERE "deletedAt" IS NULL
      DO NOTHING
      RETURNING *
    ),
    ${linkReports}
  `;
  const options = {
    replacements: { entityId, userId, collaboratorTypeId, reportIds },
    type: QueryTypes.SELECT,
    ...(transaction && { transaction }),
  };

  // Each pass takes a fresh snapshot, so a collaborator another transaction committed (or
  // deleted) since the last statement is seen on the next one.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    let [row] = await sequelize.query(linkExisting, options);
    if (!row) {
      // eslint-disable-next-line no-await-in-loop
      [row] = await sequelize.query(createAndLink, options);
    }
    if (row) {
      return sequelize.models[collaborators].build(row, { isNewRecord: false, raw: true });
    }
  }
  throw new Error(
    `Could not find or create the ${typeName} collaborator for ${genericCollaboratorType} ${entityId}`
  );
};

/**
 * Populates the collaborator for a specific type of entity for the current user.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} options - Additional options for the query.
 * @param {number} entityId - The ID of the entity.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The activity reports to link, as `{ activityReportIds: [...] }`.
 * @returns {Promise} A promise that resolves to the result of populating the collaborator.
 */
const currentUserPopulateCollaboratorForType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  typeName,
  linkBack = null
) => {
  // Get the ID of the currently logged in user
  const userId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');
  if (!userId && process.env.NODE_ENV !== 'production') return Promise.resolve();

  // Populate the collaborator for the specified type of entity using the current user's
  // ID and typeName
  return findOrCreateCollaborator(
    genericCollaboratorType,
    sequelize,
    transaction,
    entityId,
    userId,
    typeName,
    linkBack
  );
};

/**
 * Unlinks the given activity reports from an entity's collaborators of one type, removing any
 * collaborator that is left linked to no reports.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object.
 * @param {number} entityId - The ID of the entity.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The activity reports to unlink, as `{ activityReportIds: [...] }`.
 */
const removeCollaboratorsForType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  typeName,
  linkBack = null
) => {
  const { collaboratorTable, idName, reportLinks, validFor } =
    collaboratorDetails[genericCollaboratorType];
  const reportIds = activityReportIdsFrom(linkBack);
  if (reportIds.length === 0 || !reportLinks) return;

  const matchingCollaborators = /* sql */ `
    c."${idName}" = :entityId
    AND c."deletedAt" IS NULL
    AND c."collaboratorTypeId" IN (
      SELECT ct.id
      FROM "CollaboratorTypes" ct
      JOIN "ValidFor" vf ON vf.id = ct."validForId"
      WHERE ct.name = :typeName AND vf.name = :validFor
    )`;

  // The FOR UPDATE lock only protects the removal while both statements share a transaction.
  const unlink = async (t) => {
    const options = {
      replacements: { entityId, typeName, validFor, reportIds },
      transaction: t,
    };

    // Lock the collaborators first, in a statement of their own: an add from another transaction
    // then waits for this removal to commit (or this waits for it), and the removal below starts
    // with a fresh snapshot that sees any links that add committed. Only collaborators linked to
    // these reports can change, so only they're locked. They're locked in user order, the order
    // the approval hook adds them in, so removals and adds on the same entity can't deadlock.
    const locked = await sequelize.query(
      /* sql */ `
      SELECT c.id
      FROM "${collaboratorTable}" c
      WHERE ${matchingCollaborators}
        AND EXISTS (
          SELECT 1
          FROM "${reportLinks.table}" l
          WHERE l."${reportLinks.collaboratorIdName}" = c.id
            AND l."activityReportId" IN (:reportIds)
        )
      ORDER BY c."userId", c.id
      FOR UPDATE
    `,
      { ...options, type: QueryTypes.SELECT }
    );
    if (locked.length === 0) return;

    // Only the locked collaborators are changed. One created after the lock statement isn't
    // locked, so another transaction could still be linking it to more reports, and this
    // statement's snapshot could miss those links and wrongly soft-delete it. Leaving it alone
    // orders this removal before the add that created it.
    //
    // A single statement unlinks the reports and soft-deletes collaborators left with no reports,
    // so it can't interleave badly with an add sharing this transaction. NOT EXISTS sees the links
    // as they were before this statement's DELETE, so the ones being removed are excluded.
    await sequelize.query(
      /* sql */ `
      WITH removed AS (
        DELETE FROM "${reportLinks.table}" l
        WHERE l."${reportLinks.collaboratorIdName}" IN (:lockedIds)
          AND l."activityReportId" IN (:reportIds)
        RETURNING l."${reportLinks.collaboratorIdName}" AS collaborator_id
      )
      UPDATE "${collaboratorTable}" c
      SET "deletedAt" = NOW()
      WHERE c.id IN (SELECT collaborator_id FROM removed)
        AND NOT EXISTS (
          SELECT 1
          FROM "${reportLinks.table}" l
          WHERE l."${reportLinks.collaboratorIdName}" = c.id
            AND l."activityReportId" NOT IN (:reportIds)
        );
    `,
      {
        ...options,
        replacements: { ...options.replacements, lockedIds: locked.map(({ id }) => id) },
      }
    );
  };

  return inTransaction(sequelize, transaction, unlink);
};

export {
  createCollaborator,
  currentUserPopulateCollaboratorForType,
  findOrCreateCollaborator,
  getCollaboratorRecord,
  getIdForCollaboratorType,
  removeCollaboratorsForType,
};
