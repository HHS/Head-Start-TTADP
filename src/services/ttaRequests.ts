import {
  APPROVER_STATUSES,
  TTA_REQUEST_MONITORING_STANDARD,
  TTA_REQUEST_NOTE_ACTIONS,
  TTA_REQUEST_STATUSES,
  TTA_REQUEST_STEPS,
} from '@ttahub/common';
import type {
  TtaRequestCitationData,
  TtaRequestPayload,
  TtaRequestReviewPayload,
} from '@ttahub/common/src/ttaRequests';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { serviceError } from '../lib/serviceError';
import syncJoinRows from '../lib/syncJoinRows';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { activeUsersWithScopesInRegion } from './users';

const namespace = 'SERVICE:TTA_REQUESTS';

const {
  TtaRequest,
  TtaRequestGrant,
  TtaRequestCitation,
  TtaRequestApprover,
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
        model: TtaRequestNote,
        as: 'notes',
        attributes: ['id', 'step', 'action', 'note', 'createdAt'],
        include: [userWithRoles('user')],
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
      [{ model: TtaRequestCitation, as: 'citations' }, 'citation', 'ASC'],
      // the history reads in the order it happened
      [{ model: TtaRequestNote, as: 'notes' }, 'createdAt', 'ASC'],
      [{ model: TtaRequestNote, as: 'notes' }, 'id', 'ASC'],
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
              status: [TTA_REQUEST_STATUSES.SUBMITTED, TTA_REQUEST_STATUSES.NEEDS_ACTION],
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
 * The request's reviewer is the one picked on the form. A reviewer who was replaced is
 * soft deleted, so what they did stays on record, and the current one is pending again.
 */
async function syncReviewerApprover(ttaRequestId: number, reviewerId: number) {
  await TtaRequestApprover.destroy({
    where: {
      ttaRequestId,
      step: TTA_REQUEST_STEPS.REVIEWER,
      userId: { [Op.ne]: reviewerId },
    },
  });

  const existing = await TtaRequestApprover.findOne({
    where: { ttaRequestId, userId: reviewerId, step: TTA_REQUEST_STEPS.REVIEWER },
    paranoid: false,
  });

  if (!existing) {
    await TtaRequestApprover.create({
      ttaRequestId,
      userId: reviewerId,
      step: TTA_REQUEST_STEPS.REVIEWER,
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
 * one of the region's reviewers, and the monitoring goal needs citations.
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
    throw dataError('A request for the monitoring goal needs at least one citation');
  }

  await syncReviewerApprover(existing.id, saved.reviewerId);

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
 * The reviewer sends the request back to its creator for changes. Their decision and note
 * are added to the request's history; the creator sees both when they edit the request.
 */
export async function reviewTtaRequest(
  existing: { id: number; reviewerId: number | null },
  { status, note }: TtaRequestReviewPayload,
  userId: number
) {
  if (status !== APPROVER_STATUSES.NEEDS_ACTION) {
    throw dataError('A TTA request review can only ask for changes');
  }

  const [updated] = await TtaRequestApprover.update(
    { status: APPROVER_STATUSES.NEEDS_ACTION },
    { where: { ttaRequestId: existing.id, userId, step: TTA_REQUEST_STEPS.REVIEWER } }
  );

  if (!updated) {
    throw dataError('Only the reviewer on the request can review it');
  }

  await TtaRequestNote.create({
    ttaRequestId: existing.id,
    userId,
    step: TTA_REQUEST_STEPS.REVIEWER,
    action: TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION,
    note: note || null,
  });

  await TtaRequest.update(
    { status: TTA_REQUEST_STATUSES.NEEDS_ACTION },
    { where: { id: existing.id } }
  );

  const reviewed = await ttaRequestById(existing.id);
  return reviewed.toJSON();
}
