import {
  APPROVER_STATUSES,
  TTA_REQUEST_ASSIGNABLE_ROLES,
  TTA_REQUEST_MONITORING_STANDARD,
  TTA_REQUEST_NOTE_ACTIONS,
  TTA_REQUEST_STATUSES,
  TTA_REQUEST_STEPS,
} from '@ttahub/common';
import type {
  TtaRequestApprovingCor,
  TtaRequestCitationData,
  TtaRequestPayload,
  TtaRequestReviewPayload,
} from '@ttahub/common/src/ttaRequests';
import moment from 'moment';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { serviceError } from '../lib/serviceError';
import syncJoinRows from '../lib/syncJoinRows';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { getCitationsByGrantIds } from './citations';
import { activeUsersWithScopesInRegion, usersByRoles } from './users';

const namespace = 'SERVICE:TTA_REQUESTS';

const {
  TtaRequest,
  TtaRequestGrant,
  TtaRequestCitation,
  TtaRequestApprover,
  TtaRequestAssignedStaff,
  TtaRequestNote,
  Grant,
  Program,
  Recipient,
  GoalTemplate,
  Role,
  User,
} = db;

/**
 * Who can review a TTA request: any active user who holds one of these scopes in its region.
 * Primary and backup approvers are deliberately left out unless they can also review.
 */
export const TTA_REQUEST_REVIEWER_SCOPES = [SCOPES.REVIEW_TTA_REQUESTS];

/** the request body, after src/routes/ttaRequests/middleware.ts has validated it */
export type TtaRequestData = Partial<TtaRequestPayload>;

interface ExistingTtaRequest {
  id: number;
  regionId: number;
  recipientId: number | null;
}

// a request that refers to grants or a recipient it cannot -> 400 rather than 500
const dataError = (message: string) => serviceError(400, message, { error: message });

/**
 * Locks the request's row for the rest of the caller's transaction (the ambient CLS
 * transaction from `transactionWrapper`). Saves and submits take this lock before reading the
 * request, so one that overlaps a submit sees it submitted instead of saving over it.
 */
export async function lockTtaRequest(id: number) {
  return TtaRequest.findByPk(id, {
    attributes: ['id'],
    lock: Transaction.LOCK.NO_KEY_UPDATE,
  });
}

const userWithRoles = (as: string) => ({
  model: User,
  as,
  attributes: ['id', 'name', 'fullName'],
  include: [{ model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } }],
});

export async function ttaRequestById(id: number) {
  return TtaRequest.findOne({
    where: { id },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'fullName'],
        include: [{ model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } }],
      },
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'name', 'fullName'],
        include: [{ model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } }],
      },
      {
        model: Recipient,
        as: 'recipient',
        attributes: ['id', 'name'],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: ['id', 'templateName', 'standard'],
      },
      {
        model: Grant,
        as: 'grants',
        attributes: [
          'id',
          'number',
          'regionId',
          'recipientId',
          'status',
          'name',
          'numberWithProgramTypes',
          'programTypes',
        ],
        through: { attributes: [] },
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: ['programType'],
          },
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['id', 'name'],
          },
        ],
      },
      {
        model: TtaRequestCitation,
        as: 'citations',
        attributes: ['id', 'citation', 'findingType'],
      },
      {
        model: TtaRequestApprover,
        as: 'approvers',
        attributes: ['id', 'userId', 'step', 'status'],
        include: [userWithRoles('user')],
      },
      {
        model: User,
        as: 'assignedStaff',
        attributes: ['id', 'name', 'fullName'],
        through: { attributes: [] },
        include: [{ model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } }],
      },
      {
        model: TtaRequestNote,
        as: 'notes',
        attributes: ['id', 'step', 'action', 'note', 'createdAt'],
        include: [userWithRoles('user')],
        // the history grows with each review, so it is loaded in its own query rather than
        // multiplying the rows of the grants and citations joined above
        separate: true,
        // the history reads in the order it happened
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
      [{ model: TtaRequestCitation, as: 'citations' }, 'citation', 'ASC'],
    ],
  });
}

/**
 * The requests the scopes allow, optionally for one recipient: the user's own drafts,
 * since drafts are private to their creator until they are submitted, and anyone's
 * requests that have been submitted, including those sent back for changes.
 */
export async function getTtaRequests(
  scopes: WhereOptions[],
  userId: number,
  recipientId: number | null = null
) {
  return TtaRequest.findAndCountAll({
    where: {
      [Op.and]: [
        ...scopes,
        {
          [Op.or]: [
            { userId, status: TTA_REQUEST_STATUSES.DRAFT },
            {
              status: [
                TTA_REQUEST_STATUSES.SUBMITTED,
                TTA_REQUEST_STATUSES.NEEDS_ACTION,
                TTA_REQUEST_STATUSES.AWAITING_APPROVAL,
              ],
            },
          ],
        },
        ...(recipientId ? [{ recipientId }] : []),
      ],
    },
    attributes: [
      'id',
      'displayId',
      'regionId',
      'recipientId',
      'status',
      'createdAt',
      'submittedAt',
    ],
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'name'],
      },
      {
        model: Recipient,
        as: 'recipient',
        attributes: ['id', 'name'],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        // the tables show a goal by its category
        attributes: ['id', 'templateName', 'standard'],
      },
      {
        // the state a request is in is the state its grants are in
        model: Grant.unscoped(), // remove recipient from response
        as: 'grants',
        attributes: ['id', 'stateCode'],
        through: { attributes: [] },
      },
    ],
    order: [['createdAt', 'DESC']],
    distinct: true,
  });
}

/**
 * The grants on a request must be the selected recipient's, in the request's region.
 * A recipient on its own must at least have a grant in that region.
 */
async function checkRecipientAndGrants(
  regionId: number,
  recipientId: number | null | undefined,
  grantIds: number[] | undefined
) {
  if (grantIds?.length && !recipientId) {
    throw dataError('Grants were selected without a recipient');
  }

  if (!recipientId) {
    return;
  }

  if (grantIds?.length) {
    const matchingGrants = await Grant.count({
      where: { id: grantIds, recipientId, regionId },
    });

    if (matchingGrants !== grantIds.length) {
      throw dataError("Every grant must belong to the request's recipient and region");
    }
    return;
  }

  const grantsInRegion = await Grant.count({ where: { recipientId, regionId } });
  if (!grantsInRegion) {
    throw dataError("The recipient has no grants in the request's region");
  }
}

/**
 * The active users who can review a request in the region, ordered by name
 */
export async function ttaRequestReviewers(regionId: number) {
  const reviewers = await activeUsersWithScopesInRegion(TTA_REQUEST_REVIEWER_SCOPES, regionId);
  return reviewers.map(({ id, name }) => ({ id, name }));
}

/**
 * The regional team members the reviewer can assign to a request, ordered by name: the
 * specialists, managers and TTACs whose home region is the request's. The reviewer is one of
 * them when their role is, so they can assign themselves.
 */
export async function ttaRequestAssignableStaff(regionId: number) {
  const staff = await usersByRoles([...TTA_REQUEST_ASSIGNABLE_ROLES], regionId);
  return staff.map(({ id, name, fullName }) => ({ id, name, fullName }));
}

/**
 * The CORs who can approve a request in the region: the primary COR first, then the backups,
 * ordered by name. Someone who is both is listed once, as the primary.
 */
export async function ttaRequestApprovingCors(regionId: number): Promise<TtaRequestApprovingCor[]> {
  const [primaries, backups] = await Promise.all([
    activeUsersWithScopesInRegion([SCOPES.APPROVE_TTA_REQUESTS], regionId),
    activeUsersWithScopesInRegion([SCOPES.BACKUP_APPROVE_TTA_REQUESTS], regionId),
  ]);
  const primaryIds = primaries.map(({ id }) => id);

  return [
    ...primaries.map(({ id, name }) => ({ id, name, isBackup: false })),
    ...backups
      .filter(({ id }) => !primaryIds.includes(id))
      .map(({ id, name }) => ({ id, name, isBackup: true })),
  ];
}

/**
 * The reviewer is picked from the region's reviewers, so anyone else is dropped, as the
 * activity report save drops approvers who cannot approve in its region
 */
async function sanitizeReviewerId(
  regionId: number,
  reviewerId: number | null | undefined,
  ttaRequestId: number | null = null
) {
  if (!reviewerId) {
    return reviewerId;
  }

  const permittedReviewers = await ttaRequestReviewers(regionId);
  if (permittedReviewers.some((user) => user.id === reviewerId)) {
    return reviewerId;
  }

  logger.warn('Filtered unauthorized reviewer from TTA request save', {
    namespace,
    ttaRequestId,
    requestedReviewerId: reviewerId,
  });
  return null;
}

async function syncCitations(ttaRequestId: number, citations: TtaRequestCitationData[]) {
  const existing = await TtaRequestCitation.findAll({
    where: { ttaRequestId },
  });

  await Promise.all(
    existing.map(async (requestCitation) => {
      const incoming = citations.find((c) => c.citation === requestCitation.citation);
      if (!incoming) {
        return requestCitation.destroy();
      }
      if ((incoming.findingType ?? null) !== requestCitation.findingType) {
        return requestCitation.update({ findingType: incoming.findingType ?? null });
      }
      return null;
    })
  );

  const existingNames = existing.map((requestCitation) => requestCitation.citation);
  const toCreate = citations
    .filter((c) => !existingNames.includes(c.citation))
    .map((c) => ({
      ttaRequestId,
      citation: c.citation,
      findingType: c.findingType ?? null,
    }));

  await TtaRequestCitation.bulkCreate(toCreate);
}

/**
 * The associations are only replaced when the body includes them, so a partial save
 * leaves the rest of the draft as it was.
 */
async function syncAssociations(ttaRequestId: number, data: TtaRequestData) {
  if (data.grantIds !== undefined) {
    await syncJoinRows(TtaRequestGrant, { ttaRequestId }, 'grantId', data.grantIds);
  }

  if (data.citations !== undefined) {
    await syncCitations(ttaRequestId, data.citations);
  }
}

/**
 * Saves a new draft. Goals are not created here; that happens when a request is approved.
 */
export async function createTtaRequest(data: TtaRequestData, userId: number) {
  const { regionId, grantIds, citations, ...fields } = data;

  await checkRecipientAndGrants(regionId, fields.recipientId, grantIds);

  if (fields.reviewerId !== undefined) {
    fields.reviewerId = await sanitizeReviewerId(regionId, fields.reviewerId);
  }

  const ttaRequest = await TtaRequest.create({
    ...fields,
    regionId,
    userId,
    lastUpdatedById: userId,
    status: TTA_REQUEST_STATUSES.DRAFT,
  });

  await syncAssociations(ttaRequest.id, { grantIds, citations });

  const saved = await ttaRequestById(ttaRequest.id);
  return saved.toJSON();
}

/**
 * Saves changes to an existing draft. The region is fixed once a request is created.
 */
export async function updateTtaRequest(
  existing: ExistingTtaRequest,
  data: TtaRequestData,
  userId: number
) {
  const recipientId = data.recipientId !== undefined ? data.recipientId : existing.recipientId;

  // a new recipient without new grants would leave the old recipient's grants behind
  let { grantIds } = data;
  if (grantIds === undefined && recipientId !== existing.recipientId) {
    grantIds = [];
  }

  if (grantIds === undefined) {
    const current = await TtaRequestGrant.findAll({
      attributes: ['grantId'],
      where: { ttaRequestId: existing.id },
    });
    await checkRecipientAndGrants(
      existing.regionId,
      recipientId,
      current.map((requestGrant) => requestGrant.grantId)
    );
  } else {
    await checkRecipientAndGrants(existing.regionId, recipientId, grantIds);
  }

  // the region is fixed once a request is created
  const { regionId: _regionId, grantIds: _grantIds, citations, ...requestFields } = data;
  const fields = {
    ...requestFields,
    lastUpdatedById: userId,
  };

  if (fields.reviewerId !== undefined) {
    fields.reviewerId = await sanitizeReviewerId(existing.regionId, fields.reviewerId, existing.id);
  }

  await TtaRequest.update(fields, {
    where: { id: existing.id },
    fields: Object.keys(fields),
  });

  await syncAssociations(existing.id, { grantIds, citations });

  const saved = await ttaRequestById(existing.id);
  return saved.toJSON();
}

/**
 * Who is on a step of the request. For the reviewer, it is the one picked on the form; for the
 * approver, the COR the reviewer sent it to. A replaced user who had acted on the step is soft
 * deleted, so what they did stays on record; one who never acted on it has nothing to show, so
 * is removed, as collaboration report approvers are. The current one is pending again.
 */
async function syncStepApprover(ttaRequestId: number, step: string, userId: number) {
  const replaced = {
    ttaRequestId,
    step,
    userId: { [Op.ne]: userId },
  };
  await TtaRequestApprover.destroy({ where: { ...replaced, status: null }, force: true });
  await TtaRequestApprover.destroy({ where: replaced });

  const existing = await TtaRequestApprover.findOne({
    where: { ttaRequestId, userId, step },
    paranoid: false,
  });

  if (!existing) {
    await TtaRequestApprover.create({
      ttaRequestId,
      userId,
      step,
      status: null,
    });
    return;
  }

  if (existing.deletedAt) {
    await existing.restore();
  }
  await existing.update({ status: null });
}

/**
 * Saves the request as it stands and submits it for review, the first time or after the
 * reviewer has asked for changes. The body has already been checked for the required
 * fields; what is left to check depends on the saved request: the reviewer must still be
 * one of the region's reviewers, and the monitoring goal needs citations when its grants
 * have any active today. Without the recipient's monitoring report there are none to choose,
 * so the request goes ahead and citations are picked on later Activity Reports.
 *
 * The creator's notes are added to the request's history, and the field is cleared so
 * the next submission starts with a blank note.
 */
export async function submitTtaRequest(
  existing: ExistingTtaRequest,
  data: TtaRequestData,
  userId: number
) {
  const saved = await updateTtaRequest(existing, data, userId);

  if (!saved.reviewerId) {
    throw dataError('The reviewer must be able to review TTA requests in the request region');
  }

  if (saved.goalTemplate?.standard === TTA_REQUEST_MONITORING_STANDARD && !saved.citations.length) {
    const grantIds = saved.grants.map((grant) => grant.id);
    const activeCitations = grantIds.length
      ? await getCitationsByGrantIds(grantIds, moment().format('YYYY-MM-DD'))
      : [];
    if (activeCitations.length) {
      throw dataError('A request for the monitoring goal needs at least one citation');
    }
  }

  await syncStepApprover(existing.id, TTA_REQUEST_STEPS.REVIEWER, saved.reviewerId);

  await TtaRequestNote.create({
    ttaRequestId: existing.id,
    userId,
    step: TTA_REQUEST_STEPS.CREATOR,
    action: TTA_REQUEST_NOTE_ACTIONS.SUBMITTED,
    note: saved.creatorNotes || null,
  });

  await TtaRequest.update(
    {
      status: TTA_REQUEST_STATUSES.SUBMITTED,
      submittedAt: new Date(),
      creatorNotes: null,
    },
    { where: { id: existing.id } }
  );

  const submitted = await ttaRequestById(existing.id);
  return submitted.toJSON();
}

/**
 * The reviewer assigns staff to the request, then either sends it back to its creator for
 * changes or sends it on to the approving COR. Their decision and note are added to the
 * request's history. Everything is checked before anything is written.
 */
export async function reviewTtaRequest(
  existing: { id: number; regionId: number },
  { status, note, assignedStaffIds, approverId }: TtaRequestReviewPayload,
  userId: number
) {
  // the body is checked by checkReviewTtaRequestBody, so the status is needs action or
  // approved, and approved comes with an approving COR
  const sentForApproval = status === APPROVER_STATUSES.APPROVED;

  const reviewer = await TtaRequestApprover.findOne({
    where: { ttaRequestId: existing.id, userId, step: TTA_REQUEST_STEPS.REVIEWER },
  });

  if (!reviewer) {
    throw dataError('Only the reviewer on the request can review it');
  }

  const assignableIds = (await ttaRequestAssignableStaff(existing.regionId)).map(({ id }) => id);
  if (!assignedStaffIds.every((id) => assignableIds.includes(id))) {
    throw dataError("The assigned staff must be regional team members in the request's region");
  }

  if (sentForApproval) {
    const cors = await ttaRequestApprovingCors(existing.regionId);
    if (!cors.some(({ id }) => id === approverId)) {
      throw dataError("The approving COR must be able to approve in the request's region");
    }
  }

  await reviewer.update({ status });

  await syncJoinRows(
    TtaRequestAssignedStaff,
    { ttaRequestId: existing.id },
    'userId',
    assignedStaffIds
  );

  if (sentForApproval) {
    await syncStepApprover(existing.id, TTA_REQUEST_STEPS.APPROVER, approverId);
  }

  await TtaRequestNote.create({
    ttaRequestId: existing.id,
    userId,
    step: TTA_REQUEST_STEPS.REVIEWER,
    action: sentForApproval
      ? TTA_REQUEST_NOTE_ACTIONS.SENT_FOR_APPROVAL
      : TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION,
    note: note || null,
  });

  await TtaRequest.update(
    {
      status: sentForApproval
        ? TTA_REQUEST_STATUSES.AWAITING_APPROVAL
        : TTA_REQUEST_STATUSES.NEEDS_ACTION,
    },
    { where: { id: existing.id } }
  );

  const reviewed = await ttaRequestById(existing.id);
  return reviewed.toJSON();
}
