import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import { Op, type WhereOptions } from 'sequelize';
import { serviceError } from '../lib/serviceError';
import syncJoinRows from '../lib/syncJoinRows';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { usersWithPermissions } from './users';

const namespace = 'SERVICE:TTA_REQUESTS';

const {
  TtaRequest,
  TtaRequestGrant,
  TtaRequestCitation,
  Grant,
  Program,
  Recipient,
  GoalTemplate,
  User,
} = db;

export interface TtaRequestCitationData {
  citation: string;
  findingType?: string | null;
}

/** the request body, after src/routes/ttaRequests/middleware.ts has validated it */
export interface TtaRequestData {
  regionId?: number;
  recipientId?: number | null;
  grantIds?: number[];
  recipientAware?: boolean | null;
  originator?: string | null;
  goalTemplateId?: number | null;
  citations?: TtaRequestCitationData[];
  context?: string | null;
  creatorNotes?: string | null;
  reviewerId?: number | null;
}

interface ExistingTtaRequest {
  id: number;
  regionId: number;
  recipientId: number | null;
}

// a request that refers to grants or a recipient it cannot -> 400 rather than 500
const dataError = (message: string) => serviceError(400, message, { error: message });

export async function ttaRequestById(id: number) {
  return TtaRequest.findOne({
    where: { id },
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
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
      [{ model: TtaRequestCitation, as: 'citations' }, 'citation', 'ASC'],
    ],
  });
}

/**
 * The creator's own draft requests that the scopes allow, optionally for one recipient.
 * Drafts are private to their creator until they are submitted.
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
        { userId, status: TTA_REQUEST_STATUSES.DRAFT },
        ...(recipientId ? [{ recipientId }] : []),
      ],
    },
    attributes: ['id', 'displayId', 'regionId', 'recipientId', 'status', 'createdAt'],
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
        attributes: ['id', 'templateName'],
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
 * The reviewer is picked from the region's approvers, so anyone else is dropped, as the
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

  const permittedApprovers = await usersWithPermissions([regionId], [SCOPES.APPROVE_REPORTS]);
  if (permittedApprovers.some((user) => user.id === reviewerId)) {
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
