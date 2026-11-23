import {
  APPROVER_STATUSES,
  TTA_REQUEST_ASSIGNABLE_ROLES,
  TTA_REQUEST_MONITORING_STANDARD,
  TTA_REQUEST_NOTE_ACTIONS,
  TTA_REQUEST_STATUSES,
  TTA_REQUEST_STEPS,
} from '@ttahub/common';
import type {
  TtaRequestApprovePayload,
  TtaRequestApprovingCor,
  TtaRequestCitationData,
  TtaRequestPayload,
  TtaRequestReviewPayload,
} from '@ttahub/common/src/ttaRequests';
import moment from 'moment';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import changeGoalStatus from '../goalServices/changeGoalStatus';
import { serviceError } from '../lib/serviceError';
import syncJoinRows from '../lib/syncJoinRows';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { getCitationsByGrantIds } from './citations';
import { isHiddenActivityReportGoal } from './goalTemplates';
import { activeUsersWithScopesInRegion, usersByRoles } from './users';

const namespace = 'SERVICE:TTA_REQUESTS';

const {
  TtaRequest,
  TtaRequestGrant,
  TtaRequestCitation,
  TtaRequestReviewer,
  TtaRequestApprover,
  TtaRequestAssignedStaff,
  TtaRequestNote,
  TtaRequestGoal,
  Goal,
  Grant,
  Program,
  Recipient,
  GoalStatusChange,
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
        model: TtaRequestReviewer,
        as: 'reviewers',
        attributes: ['id', 'userId', 'status'],
        include: [userWithRoles('user')],
      },
      {
        model: TtaRequestApprover,
        as: 'approvers',
        attributes: ['id', 'userId', 'status'],
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
        model: Goal,
        as: 'goals',
        attributes: ['id', 'name', 'status', 'grantId'],
        through: { attributes: [] },
        // the goal's default scope has a where, which would make this an inner join
        required: false,
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

/** the requests still moving through review, and the ones the COR has approved */
export type TtaRequestList = 'active' | 'approved';

const ACTIVE_STATUSES = [
  TTA_REQUEST_STATUSES.SUBMITTED,
  TTA_REQUEST_STATUSES.NEEDS_ACTION,
  TTA_REQUEST_STATUSES.AWAITING_APPROVAL,
];

/**
 * The requests the scopes allow, optionally for one recipient. The active list has the user's
 * own drafts, since drafts are private to their creator until they are submitted, and anyone's
 * requests that have been submitted, including those sent back for changes. The approved list
 * has the requests the COR has approved, with the staff assigned to them.
 */
export async function getTtaRequests(
  scopes: WhereOptions[],
  userId: number,
  recipientId: number | null = null,
  list: TtaRequestList = 'active'
) {
  const approved = list === 'approved';

  return TtaRequest.findAndCountAll({
    where: {
      [Op.and]: [
        ...scopes,
        approved
          ? { status: TTA_REQUEST_STATUSES.APPROVED }
          : {
              [Op.or]: [
                { userId, status: TTA_REQUEST_STATUSES.DRAFT },
                { status: ACTIVE_STATUSES },
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
      'approvedAt',
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
        // the COR the reviewer sent the request to, which the status reads by
        model: TtaRequestApprover,
        as: 'approvers',
        attributes: ['id', 'userId', 'status'],
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
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
      ...(approved
        ? [
            {
              model: User,
              as: 'assignedStaff',
              attributes: ['id', 'name'],
              through: { attributes: [] },
            },
          ]
        : []),
    ],
    order: [[approved ? 'approvedAt' : 'createdAt', 'DESC']],
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
 * Who is on a step of the request: its reviewer, the one picked on the form, or its approver,
 * the COR the reviewer sent it to. A replaced user who had acted on the step is soft deleted,
 * so what they did stays on record; one who never acted on it has nothing to show, so is
 * removed, as collaboration report approvers are. The current one is pending again.
 */
async function syncStepUser(
  model: typeof TtaRequestReviewer | typeof TtaRequestApprover,
  ttaRequestId: number,
  userId: number
) {
  const replaced = {
    ttaRequestId,
    userId: { [Op.ne]: userId },
  };
  await model.destroy({ where: { ...replaced, status: null }, force: true });
  await model.destroy({ where: replaced });

  const existing = await model.findOne({
    where: { ttaRequestId, userId },
    paranoid: false,
  });

  if (!existing) {
    await model.create({
      ttaRequestId,
      userId,
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

  await checkGoalTemplate(existing.regionId, saved.goalTemplateId);

  if (saved.goalTemplate?.standard === TTA_REQUEST_MONITORING_STANDARD && !saved.citations.length) {
    const grantIds = saved.grants.map((grant) => grant.id);
    const activeCitations = grantIds.length
      ? await getCitationsByGrantIds(grantIds, moment().format('YYYY-MM-DD'))
      : [];
    if (activeCitations.length) {
      throw dataError('A request for the monitoring goal needs at least one citation');
    }
  }

  await syncStepUser(TtaRequestReviewer, existing.id, saved.reviewerId);

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
 * changes, where no staff need be assigned, or sends it on to the approving COR. Their decision and note are added to the
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

  const reviewer = await TtaRequestReviewer.findOne({
    where: { ttaRequestId: existing.id, userId },
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
    await syncStepUser(TtaRequestApprover, existing.id, approverId);
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

/**
 * A request's goal template has to be one the form offers for its grants: a curated template
 * for every region or for the request's region. The form only lists those, so any other id was
 * crafted or left over, and the request can't go on with it.
 */
async function checkGoalTemplate(regionId: number, goalTemplateId: number | null) {
  if (!goalTemplateId) {
    throw dataError('A request needs a goal before it can be approved');
  }

  const goalTemplate = await GoalTemplate.findOne({
    attributes: ['id', 'templateName', 'standard'],
    where: {
      id: goalTemplateId,
      creationMethod: CREATION_METHOD.CURATED,
      regionId: { [Op.or]: [null, regionId] },
    },
  });

  if (!goalTemplate) {
    throw dataError('The goal must be one that can be used in the request region');
  }

  return goalTemplate;
}

/**
 * The status a suspended goal goes back to: the one it had before it was last suspended, or
 * In Progress, as approving an Activity Report would set it, when there is no record of that.
 */
async function statusBeforeSuspension(goalId: number) {
  const suspension = await GoalStatusChange.findOne({
    attributes: ['oldStatus'],
    where: { goalId, newStatus: GOAL_STATUS.SUSPENDED },
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return [GOAL_STATUS.NOT_STARTED, GOAL_STATUS.IN_PROGRESS].includes(suspension?.oldStatus)
    ? suspension.oldStatus
    : GOAL_STATUS.IN_PROGRESS;
}

/**
 * The goals an approved request is for: one on each of its grants, from its goal template.
 * A grant only ever has one open goal from a template, so one it already has is reused;
 * otherwise a new one is created in Not Started. A closed goal is never reopened. Either way it
 * is linked to the request. The request's citations stay on it, to be picked on later Activity
 * Reports.
 *
 * A goal that is only on Activity Reports that are not yet approved is hidden from the
 * recipient record and removed with them; the request takes it over, so it shows on the
 * recipient record and stays if those reports drop it. A suspended goal goes back to the status
 * it had before it was suspended.
 *
 * Monitoring goals only come from the recipient's monitoring reports, so a request for the
 * monitoring goal is linked to the ones its grants have and never creates one.
 */
async function createGoalsForApprovedRequest(ttaRequestId: number, userId: number) {
  const ttaRequest = await TtaRequest.findByPk(ttaRequestId, {
    attributes: ['id', 'regionId', 'goalTemplateId'],
    include: [{ model: TtaRequestGrant, as: 'requestGrants', attributes: ['grantId'] }],
  });

  const goalTemplate = await checkGoalTemplate(ttaRequest.regionId, ttaRequest.goalTemplateId);
  const grantIds: number[] = ttaRequest.requestGrants.map(({ grantId }) => grantId);

  if (!grantIds.length) {
    throw dataError('A request needs at least one grant before it can be approved');
  }

  // Other requests and reports for the same grants may be saved at the same time, and each
  // would find no goal and create one. Locking the grants (in order, so two approvals can't
  // deadlock) makes approvals take turns for the rest of the caller's transaction.
  await Grant.unscoped().findAll({
    attributes: ['id'],
    where: { id: grantIds },
    order: [['id', 'ASC']],
    lock: Transaction.LOCK.NO_KEY_UPDATE,
  });

  const openGoals = await Goal.findAll({
    attributes: ['id', 'grantId', 'status', 'createdVia', 'onApprovedAR'],
    where: {
      grantId: grantIds,
      goalTemplateId: goalTemplate.id,
      status: { [Op.ne]: GOAL_STATUS.CLOSED },
    },
  });

  const isMonitoring = goalTemplate.standard === TTA_REQUEST_MONITORING_STANDARD;

  // each grant has its own goal from the template, so they can be found or created together
  await Promise.all(
    grantIds.map(async (grantId) => {
      let goal = openGoals.find((openGoal) => openGoal.grantId === grantId);

      if (!goal) {
        if (isMonitoring) {
          return;
        }
        goal = await Goal.create({
          name: goalTemplate.templateName,
          grantId,
          goalTemplateId: goalTemplate.id,
          status: GOAL_STATUS.NOT_STARTED,
          createdVia: 'ttaRequest',
        });
      }

      if (isHiddenActivityReportGoal(goal)) {
        await goal.update({ createdVia: 'ttaRequest' });
      }

      if (goal.status === GOAL_STATUS.SUSPENDED) {
        await changeGoalStatus({
          goalId: goal.id,
          userId,
          newStatus: await statusBeforeSuspension(goal.id),
          reason: 'Goal unsuspended by TTA request approval',
          context: 'approveTtaRequest',
        });
      }

      await TtaRequestGoal.findOrCreate({ where: { ttaRequestId, goalId: goal.id } });
    })
  );
}

/**
 * A primary or backup COR in the request's region either approves it, which creates its goals,
 * or sends it back to its reviewer for changes, who reviews it again. Their decision and note are
 * added to the request's history. A backup acting in place of the COR the reviewer picked
 * becomes the request's approver.
 */
export async function approveTtaRequest(
  existing: { id: number; regionId: number },
  { status, note }: TtaRequestApprovePayload,
  userId: number
) {
  // the body is checked by checkApproveTtaRequestBody, so the status is needs action or approved
  const approved = status === APPROVER_STATUSES.APPROVED;

  if (approved) {
    await createGoalsForApprovedRequest(existing.id, userId);
  } else {
    // the request is back with its reviewer, so their review is pending again
    await TtaRequestReviewer.update({ status: null }, { where: { ttaRequestId: existing.id } });
  }

  await syncStepUser(TtaRequestApprover, existing.id, userId);
  await TtaRequestApprover.update({ status }, { where: { ttaRequestId: existing.id, userId } });

  await TtaRequestNote.create({
    ttaRequestId: existing.id,
    userId,
    step: TTA_REQUEST_STEPS.APPROVER,
    action: approved ? TTA_REQUEST_NOTE_ACTIONS.APPROVED : TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION,
    note: note || null,
  });

  await TtaRequest.update(
    approved
      ? { status: TTA_REQUEST_STATUSES.APPROVED, approvedAt: new Date() }
      : { status: TTA_REQUEST_STATUSES.SUBMITTED },
    { where: { id: existing.id } }
  );

  const result = await ttaRequestById(existing.id);
  return result.toJSON();
}
