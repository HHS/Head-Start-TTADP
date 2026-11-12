import {
  APPROVER_STATUSES,
  TTA_REQUEST_NOTE_ACTIONS,
  TTA_REQUEST_STATUSES,
  TTA_REQUEST_STEPS,
} from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import filtersToScopes from '../scopes';
import {
  createGoalTemplate,
  createGrant,
  createRecipient,
  createRegion,
  createUser,
} from '../testUtils';
import { getCitationsByGrantIds } from './citations';
import {
  createTtaRequest,
  getTtaRequests,
  lockTtaRequest,
  reviewTtaRequest,
  submitTtaRequest,
  ttaRequestApprovingCors,
  ttaRequestAssignableStaff,
  ttaRequestById,
  ttaRequestReviewers,
  updateTtaRequest,
} from './ttaRequests';

jest.mock('./citations', () => ({
  ...jest.requireActual('./citations'),
  getCitationsByGrantIds: jest.fn(),
}));

const {
  Goal,
  Grant,
  GoalTemplate,
  Permission,
  Recipient,
  Region,
  Role,
  TtaRequest,
  TtaRequestApprover,
  TtaRequestReviewer,
  TtaRequestAssignedStaff,
  TtaRequestCitation,
  User,
  UserRole,
} = db;

describe('ttaRequests service', () => {
  let creator;
  let reviewer;
  let recipient;
  let otherRecipient;
  let grantOne;
  let grantTwo;
  let otherRegionGrant;
  let otherRecipientGrant;
  let goalTemplate;
  // a TTAC in region 1, whom the reviewer can assign, and a backup COR there
  let staffMember;
  let backupCor;
  let assigned;

  beforeAll(async () => {
    [creator, reviewer, recipient, otherRecipient, goalTemplate, staffMember, backupCor] =
      await Promise.all([
        createUser({}),
        createUser({}),
        createRecipient({}),
        createRecipient({}),
        createGoalTemplate(),
        createUser({ homeRegionId: 1 }),
        createUser({ homeRegionId: 1 }),
      ]);
    assigned = { assignedStaffIds: [staffMember.id] };
    const ttac = await Role.findOne({ where: { name: 'TTAC' } });

    [grantOne, grantTwo, otherRegionGrant, otherRecipientGrant] = await Promise.all([
      createGrant({ recipientId: recipient.id, regionId: 1 }),
      createGrant({ recipientId: recipient.id, regionId: 1 }),
      createGrant({ recipientId: recipient.id, regionId: 2 }),
      createGrant({ recipientId: otherRecipient.id, regionId: 1 }),
      // the reviewer is active and can review in region 1, where these requests are
      Permission.create({ userId: reviewer.id, regionId: 1, scopeId: SCOPES.REVIEW_TTA_REQUESTS }),
      Permission.create({ userId: reviewer.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS }),
      Permission.create({ userId: staffMember.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS }),
      UserRole.create({ userId: staffMember.id, roleId: ttac.id }),
      Permission.create({ userId: backupCor.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS }),
      Permission.create({
        userId: backupCor.id,
        regionId: 1,
        scopeId: SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
      }),
    ]);
  });

  afterAll(async () => {
    // the join tables cascade with their request
    await TtaRequest.destroy({ where: { userId: creator.id }, force: true });
    await Grant.destroy({
      where: { id: [grantOne.id, grantTwo.id, otherRegionGrant.id, otherRecipientGrant.id] },
      force: true,
      individualHooks: true,
    });
    await Recipient.destroy({ where: { id: [recipient.id, otherRecipient.id] }, force: true });
    await GoalTemplate.destroy({ where: { id: goalTemplate.id } });
    const userIds = [creator.id, reviewer.id, staffMember.id, backupCor.id];
    await Permission.destroy({ where: { userId: userIds } });
    await UserRole.destroy({ where: { userId: userIds } });
    await User.destroy({ where: { id: userIds } });
    await db.sequelize.close();
  });

  describe('createTtaRequest', () => {
    it('saves a draft with only a region', async () => {
      const saved = await createTtaRequest({ regionId: 1 }, creator.id);

      expect(saved.id).toBeDefined();
      expect(saved.status).toBe(TTA_REQUEST_STATUSES.DRAFT);
      expect(saved.userId).toBe(creator.id);
      expect(saved.lastUpdatedById).toBe(creator.id);
      expect(saved.recipientId).toBeNull();
      expect(saved.grants).toEqual([]);
      expect(saved.citations).toEqual([]);
      expect(saved.displayId).toBe(`R01-REQ-${saved.id}`);
    });

    it('saves every field the creator filled in', async () => {
      const saved = await createTtaRequest(
        {
          regionId: 1,
          recipientId: recipient.id,
          grantIds: [grantOne.id, grantTwo.id],
          recipientAware: true,
          originator: 'Regional Office',
          goalTemplateId: goalTemplate.id,
          citations: [{ citation: '1302.47(b)(5)(iv)', findingType: 'Deficiency' }],
          context: '<p>Some context</p>',
          creatorNotes: 'A note',
          reviewerId: reviewer.id,
        },
        creator.id
      );

      expect(saved.recipient.id).toBe(recipient.id);
      expect(saved.grants.map((g) => g.id).sort()).toEqual([grantOne.id, grantTwo.id].sort());
      expect(saved.grants[0].numberWithProgramTypes).toBeDefined();
      expect(saved.recipientAware).toBe(true);
      expect(saved.originator).toBe('Regional Office');
      expect(saved.goalTemplate.id).toBe(goalTemplate.id);
      expect(saved.citations).toEqual([
        expect.objectContaining({ citation: '1302.47(b)(5)(iv)', findingType: 'Deficiency' }),
      ]);
      expect(saved.context).toBe('<p>Some context</p>');
      expect(saved.creatorNotes).toBe('A note');
      expect(saved.reviewer.id).toBe(reviewer.id);
    });

    it('does not create goals', async () => {
      await createTtaRequest(
        {
          regionId: 1,
          recipientId: recipient.id,
          grantIds: [grantOne.id],
          goalTemplateId: goalTemplate.id,
        },
        creator.id
      );

      const goals = await Goal.count({ where: { grantId: [grantOne.id, grantTwo.id] } });
      expect(goals).toBe(0);
    });

    it('rejects a grant from another region', async () => {
      await expect(
        createTtaRequest(
          { regionId: 1, recipientId: recipient.id, grantIds: [otherRegionGrant.id] },
          creator.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects a grant belonging to another recipient', async () => {
      await expect(
        createTtaRequest(
          { regionId: 1, recipientId: recipient.id, grantIds: [otherRecipientGrant.id] },
          creator.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects grants without a recipient', async () => {
      await expect(
        createTtaRequest({ regionId: 1, grantIds: [grantOne.id] }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('drops a reviewer who cannot review in the region', async () => {
      const saved = await createTtaRequest({ regionId: 1, reviewerId: creator.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });

    it('drops a reviewer who can review in another region', async () => {
      const saved = await createTtaRequest({ regionId: 2, reviewerId: reviewer.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });

    it('rejects a recipient with no grants in the region', async () => {
      await expect(
        createTtaRequest({ regionId: 3, recipientId: recipient.id }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('updateTtaRequest', () => {
    it('updates fields and replaces grants and citations', async () => {
      const created = await createTtaRequest(
        {
          regionId: 1,
          recipientId: recipient.id,
          grantIds: [grantOne.id],
          citations: [
            { citation: 'first', findingType: 'Deficiency' },
            { citation: 'second', findingType: 'Noncompliance' },
          ],
          context: 'before',
        },
        creator.id
      );

      const updated = await updateTtaRequest(
        created,
        {
          grantIds: [grantTwo.id],
          citations: [
            { citation: 'second', findingType: 'Area of Concern' },
            { citation: 'third', findingType: null },
          ],
          context: 'after',
        },
        reviewer.id
      );

      expect(updated.context).toBe('after');
      expect(updated.lastUpdatedById).toBe(reviewer.id);
      expect(updated.userId).toBe(creator.id);
      expect(updated.grants.map((g) => g.id)).toEqual([grantTwo.id]);
      expect(updated.citations.map((c) => [c.citation, c.findingType])).toEqual([
        ['second', 'Area of Concern'],
        ['third', null],
      ]);
    });

    it('leaves the associations alone when the body omits them', async () => {
      const created = await createTtaRequest(
        {
          regionId: 1,
          recipientId: recipient.id,
          grantIds: [grantOne.id],
          citations: [{ citation: 'kept', findingType: 'Deficiency' }],
        },
        creator.id
      );

      const updated = await updateTtaRequest(created, { creatorNotes: 'changed' }, creator.id);

      expect(updated.creatorNotes).toBe('changed');
      expect(updated.grants.map((g) => g.id)).toEqual([grantOne.id]);
      expect(updated.citations.map((c) => c.citation)).toEqual(['kept']);
    });

    it('clears the grants when the recipient changes without new grants', async () => {
      const created = await createTtaRequest(
        { regionId: 1, recipientId: recipient.id, grantIds: [grantOne.id] },
        creator.id
      );

      const updated = await updateTtaRequest(
        created,
        { recipientId: otherRecipient.id },
        creator.id
      );

      expect(updated.recipientId).toBe(otherRecipient.id);
      expect(updated.grants).toEqual([]);
    });

    it('clears the citations when given an empty list', async () => {
      const created = await createTtaRequest(
        { regionId: 1, citations: [{ citation: 'gone', findingType: 'Deficiency' }] },
        creator.id
      );

      await updateTtaRequest(created, { citations: [] }, creator.id);

      const remaining = await TtaRequestCitation.count({ where: { ttaRequestId: created.id } });
      expect(remaining).toBe(0);
    });

    it('rejects a grant from another recipient', async () => {
      const created = await createTtaRequest(
        { regionId: 1, recipientId: recipient.id },
        creator.id
      );

      await expect(
        updateTtaRequest(created, { grantIds: [otherRecipientGrant.id] }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('ttaRequestReviewers', () => {
    let approver;
    let backupApprover;
    let writeOnly;
    let readOnly;
    let otherRegion;
    let twoScopes;
    let inactive;

    const permit = (userId: number, scopeId: number, regionId = 1) =>
      Permission.create({ userId, regionId, scopeId });

    beforeAll(async () => {
      [approver, backupApprover, writeOnly, readOnly, otherRegion, twoScopes, inactive] =
        await Promise.all(Array.from({ length: 7 }, () => createUser({})));

      // everyone but the inactive user can sign in
      const active = [approver, backupApprover, writeOnly, readOnly, otherRegion, twoScopes];

      await Promise.all([
        ...active.map((user) => permit(user.id, SCOPES.SITE_ACCESS, 14)),
        permit(approver.id, SCOPES.APPROVE_TTA_REQUESTS),
        permit(backupApprover.id, SCOPES.BACKUP_APPROVE_TTA_REQUESTS),
        permit(writeOnly.id, SCOPES.READ_WRITE_TTA_REQUESTS),
        permit(readOnly.id, SCOPES.READ_REPORTS),
        permit(otherRegion.id, SCOPES.REVIEW_TTA_REQUESTS, 2),
        permit(twoScopes.id, SCOPES.REVIEW_TTA_REQUESTS),
        permit(twoScopes.id, SCOPES.BACKUP_APPROVE_TTA_REQUESTS),
        permit(inactive.id, SCOPES.REVIEW_TTA_REQUESTS),
      ]);
    });

    afterAll(async () => {
      const ids = [
        approver,
        backupApprover,
        writeOnly,
        readOnly,
        otherRegion,
        twoScopes,
        inactive,
      ].map((u) => u.id);
      await Permission.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
    });

    it('lists users who can review in the region, once each', async () => {
      const reviewers = await ttaRequestReviewers(1);
      const ids = reviewers.map((u) => u.id);

      expect(ids).toEqual(expect.arrayContaining([reviewer.id, twoScopes.id]));
      expect(ids.filter((id) => id === twoScopes.id)).toHaveLength(1);
    });

    it('leaves out approvers, inactive users and those without the review permission in the region', async () => {
      const ids = (await ttaRequestReviewers(1)).map((u) => u.id);

      [approver, backupApprover, writeOnly, readOnly, otherRegion, inactive, creator].forEach(
        (user) => {
          expect(ids).not.toContain(user.id);
        }
      );
    });

    it('drops a saved reviewer who can only approve in the region', async () => {
      const saved = await createTtaRequest({ regionId: 1, reviewerId: approver.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });

    it('drops a saved reviewer who can only write in the region', async () => {
      const saved = await createTtaRequest({ regionId: 1, reviewerId: writeOnly.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });
  });

  describe('ttaRequestAssignableStaff', () => {
    let assistant;
    let programSpecialist;
    let otherRegionTtac;
    let inactiveTtac;

    beforeAll(async () => {
      [assistant, programSpecialist, otherRegionTtac, inactiveTtac] = await Promise.all([
        createUser({ homeRegionId: 1 }),
        createUser({ homeRegionId: 1 }),
        createUser({ homeRegionId: 2 }),
        createUser({ homeRegionId: 1 }),
      ]);
      const roles = await Role.findAll({ where: { name: ['AA', 'PS', 'TTAC'] } });
      const roleId = (name: string) => roles.find((role) => role.name === name).id;

      await Promise.all([
        ...[assistant, programSpecialist, otherRegionTtac].map((user) =>
          Permission.create({ userId: user.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS })
        ),
        UserRole.create({ userId: assistant.id, roleId: roleId('AA') }),
        UserRole.create({ userId: programSpecialist.id, roleId: roleId('PS') }),
        UserRole.create({ userId: otherRegionTtac.id, roleId: roleId('TTAC') }),
        UserRole.create({ userId: inactiveTtac.id, roleId: roleId('TTAC') }),
      ]);
    });

    afterAll(async () => {
      const ids = [assistant, programSpecialist, otherRegionTtac, inactiveTtac].map((u) => u.id);
      await Permission.destroy({ where: { userId: ids } });
      await UserRole.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
    });

    it('lists the active specialists, managers and TTACs in the region', async () => {
      const staff = await ttaRequestAssignableStaff(1);

      expect(staff).toEqual(
        expect.arrayContaining([
          { id: staffMember.id, name: staffMember.name, fullName: `${staffMember.name}, TTAC` },
        ])
      );
    });

    it('leaves out admin assistants, program specialists, other regions and inactive users', async () => {
      const ids = (await ttaRequestAssignableStaff(1)).map(({ id }) => id);

      [assistant, programSpecialist, otherRegionTtac, inactiveTtac, creator].forEach((user) => {
        expect(ids).not.toContain(user.id);
      });
    });
  });

  describe('ttaRequestApprovingCors', () => {
    let region;
    let primary;
    let backupB;
    let backupA;

    beforeAll(async () => {
      region = await createRegion({});
      [primary, backupB, backupA] = await Promise.all([
        createUser({ name: 'Primary COR' }),
        createUser({ name: 'B backup' }),
        createUser({ name: 'A backup' }),
      ]);
      await Promise.all([
        ...[primary, backupB, backupA].map((user) =>
          Permission.create({ userId: user.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS })
        ),
        Permission.create({
          userId: primary.id,
          regionId: region.id,
          scopeId: SCOPES.APPROVE_TTA_REQUESTS,
        }),
        // the primary COR is also a backup, and is still listed once
        Permission.create({
          userId: primary.id,
          regionId: region.id,
          scopeId: SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
        }),
        ...[backupB, backupA].map((user) =>
          Permission.create({
            userId: user.id,
            regionId: region.id,
            scopeId: SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
          })
        ),
      ]);
    });

    afterAll(async () => {
      const ids = [primary, backupB, backupA].map((u) => u.id);
      await Permission.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
      await Region.destroy({ where: { id: region.id } });
    });

    it('lists the primary COR first, then the backups by name, each once', async () => {
      expect(await ttaRequestApprovingCors(region.id)).toEqual([
        { id: primary.id, name: 'Primary COR', isBackup: false },
        { id: backupA.id, name: 'A backup', isBackup: true },
        { id: backupB.id, name: 'B backup', isBackup: true },
      ]);
    });
  });

  describe('updateTtaRequest reviewer', () => {
    it('saves a reviewer in the region as the reviewer', async () => {
      const created = await createTtaRequest({ regionId: 1 }, creator.id);
      const updated = await updateTtaRequest(created, { reviewerId: reviewer.id }, creator.id);
      expect(updated.reviewer.id).toBe(reviewer.id);
    });

    it('drops a reviewer who cannot review in the region', async () => {
      const created = await createTtaRequest({ regionId: 1, reviewerId: reviewer.id }, creator.id);
      const updated = await updateTtaRequest(created, { reviewerId: creator.id }, creator.id);
      expect(updated.reviewerId).toBeNull();
    });
  });

  describe('getTtaRequests', () => {
    let ownDraft;
    let otherRecipientDraft;
    let someoneElsesDraft;
    let someoneElsesSubmitted;

    beforeAll(async () => {
      [ownDraft, otherRecipientDraft, someoneElsesDraft, someoneElsesSubmitted] = await Promise.all(
        [
          createTtaRequest(
            {
              regionId: 1,
              recipientId: recipient.id,
              grantIds: [grantOne.id],
              goalTemplateId: goalTemplate.id,
              reviewerId: reviewer.id,
            },
            creator.id
          ),
          createTtaRequest({ regionId: 1, recipientId: otherRecipient.id }, creator.id),
          createTtaRequest({ regionId: 1, recipientId: recipient.id }, reviewer.id),
          createTtaRequest({ regionId: 1, recipientId: recipient.id }, reviewer.id),
        ]
      );
      await TtaRequest.update(
        { status: TTA_REQUEST_STATUSES.SUBMITTED, submittedAt: new Date() },
        { where: { id: someoneElsesSubmitted.id } }
      );
    });

    afterAll(async () => {
      await TtaRequest.destroy({
        where: { id: [someoneElsesDraft.id, someoneElsesSubmitted.id] },
        force: true,
      });
    });

    const scopesFor = async (filters) => {
      const { ttaRequest: scopes } = await filtersToScopes(filters, { userId: creator.id });
      return scopes;
    };

    it("lists the creator's own drafts with what the tables show", async () => {
      const { rows } = await getTtaRequests(await scopesFor({ 'region.in': [1] }), creator.id);
      const ids = rows.map((row) => row.id);

      expect(ids).toContain(ownDraft.id);
      expect(ids).toContain(otherRecipientDraft.id);
      expect(ids).not.toContain(someoneElsesDraft.id);
      expect(ids).toContain(someoneElsesSubmitted.id);

      const row = rows.find((r) => r.id === ownDraft.id).toJSON();
      expect(row.displayId).toBe(`R01-REQ-${ownDraft.id}`);
      expect(row.recipient.name).toBe(recipient.name);
      expect(row.creator.id).toBe(creator.id);
      expect(row.reviewer.id).toBe(reviewer.id);
      expect(row.goalTemplate.id).toBe(goalTemplate.id);
      // the tables show the goal's category
      expect(row.goalTemplate).toHaveProperty('standard');
      expect(row.grants.map((g) => g.id)).toEqual([grantOne.id]);
    });

    it('lists only the drafts for one recipient', async () => {
      const { rows } = await getTtaRequests(
        await scopesFor({ 'region.in': [1] }),
        creator.id,
        recipient.id
      );
      const ids = rows.map((row) => row.id);

      expect(ids).toContain(ownDraft.id);
      expect(ids).not.toContain(otherRecipientDraft.id);
    });

    it('lists nothing outside the filtered regions', async () => {
      const { rows } = await getTtaRequests(await scopesFor({ 'region.in': [2] }), creator.id);
      expect(rows.map((row) => row.id)).not.toContain(ownDraft.id);
    });
  });

  describe('submitTtaRequest', () => {
    let monitoringTemplate;

    const complete = {
      recipientId: null,
      grantIds: [],
      recipientAware: true,
      originator: 'Recipient',
      goalTemplateId: null,
      citations: [],
      context: '<p>Context</p>',
      creatorNotes: '',
      reviewerId: null,
    };

    beforeAll(async () => {
      // standard is generated from the template name, and the monitoring template is unique
      monitoringTemplate = await GoalTemplate.findOne({ where: { standard: 'Monitoring' } });
      Object.assign(complete, {
        recipientId: recipient.id,
        grantIds: [grantOne.id],
        goalTemplateId: goalTemplate.id,
        reviewerId: reviewer.id,
      });
    });

    it('saves the request and marks it submitted', async () => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      const submitted = await submitTtaRequest(draft, complete, creator.id);

      expect(submitted.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(submitted.submittedAt).toBeInstanceOf(Date);
      expect(submitted.recipient.id).toBe(recipient.id);
      expect(submitted.grants.map((g) => g.id)).toEqual([grantOne.id]);
      expect(submitted.reviewer.id).toBe(reviewer.id);
      expect(submitted.context).toBe('<p>Context</p>');
    });

    it('rejects a reviewer who cannot review in the region', async () => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      await expect(
        submitTtaRequest(draft, { ...complete, reviewerId: creator.id }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('leaves the draft as it was when a rejected submission rolls back', async () => {
      const draft = await createTtaRequest(
        { regionId: 1, context: '<p>Before</p>', reviewerId: reviewer.id },
        creator.id
      );

      // the route runs this in transactionWrapper, which rolls back when it throws
      await expect(
        db.sequelize.transaction(() =>
          submitTtaRequest(
            draft,
            { ...complete, context: '<p>After</p>', reviewerId: creator.id },
            creator.id
          )
        )
      ).rejects.toMatchObject({ statusCode: 400 });

      const stored = await ttaRequestById(draft.id);
      expect(stored.status).toBe(TTA_REQUEST_STATUSES.DRAFT);
      expect(stored.context).toBe('<p>Before</p>');
      expect(stored.reviewerId).toBe(reviewer.id);
      expect(stored.grants).toHaveLength(0);
    });

    it('rejects the monitoring goal without citations when the grants have some', async () => {
      (getCitationsByGrantIds as jest.Mock).mockResolvedValueOnce([
        { standardId: 1, citation: '1302.47(b)(5)(iv)', grants: [] },
      ]);
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      await expect(
        submitTtaRequest(draft, { ...complete, goalTemplateId: monitoringTemplate.id }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(getCitationsByGrantIds).toHaveBeenCalledWith(
        [grantOne.id],
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });

    it('submits the monitoring goal without citations when the grants have none', async () => {
      (getCitationsByGrantIds as jest.Mock).mockResolvedValueOnce([]);
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      const submitted = await submitTtaRequest(
        draft,
        { ...complete, goalTemplateId: monitoringTemplate.id },
        creator.id
      );

      expect(submitted.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(submitted.citations).toEqual([]);
    });

    it('submits the monitoring goal with citations', async () => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      const submitted = await submitTtaRequest(
        draft,
        {
          ...complete,
          goalTemplateId: monitoringTemplate.id,
          citations: [{ citation: '1302.47(b)(5)(iv)', findingType: 'Deficiency' }],
        },
        creator.id
      );

      expect(submitted.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
    });

    it("records the creator's notes in the history and clears the field", async () => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      const submitted = await submitTtaRequest(
        draft,
        { ...complete, creatorNotes: 'Please look at this' },
        creator.id
      );

      expect(submitted.creatorNotes).toBeNull();
      expect(submitted.notes).toHaveLength(1);
      expect(submitted.notes[0]).toMatchObject({
        step: TTA_REQUEST_STEPS.CREATOR,
        action: TTA_REQUEST_NOTE_ACTIONS.SUBMITTED,
        note: 'Please look at this',
      });
      expect(submitted.notes[0].user.id).toBe(creator.id);
      expect(submitted.reviewers).toHaveLength(1);
      expect(submitted.reviewers[0]).toMatchObject({ userId: reviewer.id, status: null });
      expect(submitted.approvers).toEqual([]);
    });
  });

  describe('reviewTtaRequest', () => {
    let otherReviewer;

    const complete = {
      recipientAware: true,
      originator: 'Recipient',
      citations: [],
      context: '<p>Context</p>',
      creatorNotes: '',
    };

    // a request the creator has submitted to the reviewer
    const submittedRequest = async (creatorNotes = 'First submission') => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);
      return submitTtaRequest(
        draft,
        {
          ...complete,
          recipientId: recipient.id,
          grantIds: [grantOne.id],
          goalTemplateId: goalTemplate.id,
          reviewerId: reviewer.id,
          creatorNotes,
        },
        creator.id
      );
    };

    const resubmit = (request, data = {}) =>
      submitTtaRequest(
        request,
        {
          ...complete,
          recipientId: recipient.id,
          grantIds: [grantOne.id],
          goalTemplateId: goalTemplate.id,
          reviewerId: reviewer.id,
          ...data,
        },
        creator.id
      );

    beforeAll(async () => {
      otherReviewer = await createUser({});
      await Promise.all([
        Permission.create({
          userId: otherReviewer.id,
          regionId: 1,
          scopeId: SCOPES.REVIEW_TTA_REQUESTS,
        }),
        Permission.create({ userId: otherReviewer.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS }),
      ]);
    });

    afterAll(async () => {
      // the requests refer to the other reviewer, so they go first
      await TtaRequest.destroy({ where: { userId: creator.id }, force: true });
      await Permission.destroy({ where: { userId: otherReviewer.id } });
      await User.destroy({ where: { id: otherReviewer.id } });
    });

    it('sends the request back to the creator with the reviewer note', async () => {
      const submitted = await submittedRequest();

      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Add the agenda' },
        reviewer.id
      );

      expect(reviewed.status).toBe(TTA_REQUEST_STATUSES.NEEDS_ACTION);
      expect(reviewed.approvers).toEqual([]);
      expect(reviewed.reviewers[0]).toMatchObject({
        userId: reviewer.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
      });
      expect(reviewed.notes.map(({ step, action, note }) => ({ step, action, note }))).toEqual([
        {
          step: TTA_REQUEST_STEPS.CREATOR,
          action: TTA_REQUEST_NOTE_ACTIONS.SUBMITTED,
          note: 'First submission',
        },
        {
          step: TTA_REQUEST_STEPS.REVIEWER,
          action: TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION,
          note: 'Add the agenda',
        },
      ]);
    });

    it('records a review without a note', async () => {
      const submitted = await submittedRequest();

      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: '' },
        reviewer.id
      );

      expect(reviewed.notes[1]).toMatchObject({
        step: TTA_REQUEST_STEPS.REVIEWER,
        action: TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION,
        note: null,
      });
    });

    it('rejects a review from someone who is not the reviewer', async () => {
      const submitted = await submittedRequest();

      await expect(
        reviewTtaRequest(
          submitted,
          { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION },
          otherReviewer.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });

      const stored = await ttaRequestById(submitted.id);
      expect(stored.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(stored.notes).toHaveLength(1);
    });

    it('keeps every round of the history in order', async () => {
      let request = await submittedRequest('Round one');
      request = await reviewTtaRequest(
        request,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Fix one' },
        reviewer.id
      );
      request = await resubmit(request, { creatorNotes: 'Round two' });
      request = await reviewTtaRequest(
        request,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Fix two' },
        reviewer.id
      );
      request = await resubmit(request, { creatorNotes: 'Round three' });

      expect(request.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(request.notes.map(({ step, action, note }) => [step, action, note])).toEqual([
        ['creator', 'submitted', 'Round one'],
        ['reviewer', 'needs_action', 'Fix one'],
        ['creator', 'submitted', 'Round two'],
        ['reviewer', 'needs_action', 'Fix two'],
        ['creator', 'submitted', 'Round three'],
      ]);
    });

    it('makes the reviewer pending again when the creator resubmits', async () => {
      const submitted = await submittedRequest();
      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Fix it' },
        reviewer.id
      );

      const resubmitted = await resubmit(reviewed, { creatorNotes: 'Fixed' });

      expect(resubmitted.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(resubmitted.creatorNotes).toBeNull();
      expect(resubmitted.reviewers).toHaveLength(1);
      expect(resubmitted.reviewers[0]).toMatchObject({ userId: reviewer.id, status: null });
    });

    it('replaces the reviewer when the creator picks another one on resubmission', async () => {
      const submitted = await submittedRequest();
      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Ask someone else' },
        reviewer.id
      );

      const resubmitted = await resubmit(reviewed, { reviewerId: otherReviewer.id });

      expect(resubmitted.reviewers).toHaveLength(1);
      expect(resubmitted.reviewers[0]).toMatchObject({ userId: otherReviewer.id, status: null });

      // the replaced reviewer's review stays on record
      const replaced = await TtaRequestReviewer.findOne({
        where: { ttaRequestId: submitted.id, userId: reviewer.id },
        paranoid: false,
      });
      expect(replaced.deletedAt).not.toBeNull();
      expect(replaced.status).toBe(APPROVER_STATUSES.NEEDS_ACTION);
    });

    it('removes a replaced reviewer who never reviewed the request', async () => {
      const submitted = await submittedRequest();

      await resubmit(submitted, { reviewerId: otherReviewer.id });

      const replaced = await TtaRequestReviewer.findOne({
        where: { ttaRequestId: submitted.id, userId: reviewer.id },
        paranoid: false,
      });
      expect(replaced).toBeNull();
    });

    it('brings back a reviewer who is picked again, pending once more', async () => {
      const submitted = await submittedRequest();
      let request = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Ask someone else' },
        reviewer.id
      );
      request = await resubmit(request, { reviewerId: otherReviewer.id });
      request = await reviewTtaRequest(
        request,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Back to the first reviewer' },
        otherReviewer.id
      );

      const resubmitted = await resubmit(request, { reviewerId: reviewer.id });

      expect(resubmitted.reviewers).toHaveLength(1);
      expect(resubmitted.reviewers[0]).toMatchObject({ userId: reviewer.id, status: null });
      const rows = await TtaRequestReviewer.findAll({
        where: { ttaRequestId: submitted.id },
        paranoid: false,
      });
      expect(rows).toHaveLength(2);
      const replaced = rows.find((row) => row.userId === otherReviewer.id);
      expect(replaced.deletedAt).not.toBeNull();
      expect(replaced.status).toBe(APPROVER_STATUSES.NEEDS_ACTION);
    });

    it('rejects a resubmission to someone who cannot review in the region', async () => {
      const submitted = await submittedRequest();
      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION },
        reviewer.id
      );

      await expect(resubmit(reviewed, { reviewerId: creator.id })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('returns the history oldest first, and the reviewers, with their users and roles', async () => {
      const submitted = await submittedRequest('First');
      await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'Second' },
        reviewer.id
      );

      const found = (await ttaRequestById(submitted.id)).toJSON();

      expect(found.notes.map(({ note }) => note)).toEqual(['First', 'Second']);
      expect(found.notes.map(({ user }) => user.id)).toEqual([creator.id, reviewer.id]);
      expect(Array.isArray(found.notes[0].user.roles)).toBe(true);
      expect(found.reviewers).toEqual([
        expect.objectContaining({
          userId: reviewer.id,
          status: APPROVER_STATUSES.NEEDS_ACTION,
          user: expect.objectContaining({ id: reviewer.id, name: reviewer.name }),
        }),
      ]);
    });

    it('saves the assigned staff with the review', async () => {
      const submitted = await submittedRequest();

      const reviewed = await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION },
        reviewer.id
      );

      expect(reviewed.assignedStaff.map(({ id }) => id)).toEqual([staffMember.id]);
      expect(reviewed.assignedStaff[0].fullName).toBe(`${staffMember.name}, TTAC`);
    });

    it('replaces the assigned staff when the request is reviewed again', async () => {
      let request = await submittedRequest();
      request = await reviewTtaRequest(
        request,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION },
        reviewer.id
      );
      request = await resubmit(request);

      // the reviewer can assign themselves when their role is assignable
      const ttac = await Role.findOne({ where: { name: 'TTAC' } });
      await Promise.all([
        UserRole.create({ userId: reviewer.id, roleId: ttac.id }),
        User.update({ homeRegionId: 1 }, { where: { id: reviewer.id } }),
      ]);

      try {
        request = await reviewTtaRequest(
          request,
          { assignedStaffIds: [reviewer.id], status: APPROVER_STATUSES.NEEDS_ACTION },
          reviewer.id
        );
        expect(request.assignedStaff.map(({ id }) => id)).toEqual([reviewer.id]);
      } finally {
        await Promise.all([
          UserRole.destroy({ where: { userId: reviewer.id, roleId: ttac.id } }),
          User.update({ homeRegionId: reviewer.homeRegionId }, { where: { id: reviewer.id } }),
        ]);
      }
    });

    it('sends the request on to the approving COR', async () => {
      const submitted = await submittedRequest();

      const reviewed = await reviewTtaRequest(
        submitted,
        {
          ...assigned,
          status: APPROVER_STATUSES.APPROVED,
          approverId: backupCor.id,
          note: 'Over to you',
        },
        reviewer.id
      );

      expect(reviewed.status).toBe(TTA_REQUEST_STATUSES.AWAITING_APPROVAL);
      expect(reviewed.reviewers.map(({ userId, status }) => ({ userId, status }))).toEqual([
        { userId: reviewer.id, status: APPROVER_STATUSES.APPROVED },
      ]);
      expect(reviewed.approvers.map(({ userId, status }) => ({ userId, status }))).toEqual([
        { userId: backupCor.id, status: null },
      ]);
      // the reviewer and the approving COR are kept apart
      expect(await TtaRequestReviewer.count({ where: { ttaRequestId: submitted.id } })).toBe(1);
      expect(await TtaRequestApprover.count({ where: { ttaRequestId: submitted.id } })).toBe(1);
      expect(reviewed.notes[1]).toMatchObject({
        step: TTA_REQUEST_STEPS.REVIEWER,
        action: TTA_REQUEST_NOTE_ACTIONS.SENT_FOR_APPROVAL,
        note: 'Over to you',
      });
      expect(reviewed.assignedStaff.map(({ id }) => id)).toEqual([staffMember.id]);
    });

    it('rejects staff who cannot be assigned, without writing anything', async () => {
      const submitted = await submittedRequest();

      // the creator has no assignable role in the region
      await expect(
        reviewTtaRequest(
          submitted,
          { assignedStaffIds: [creator.id], status: APPROVER_STATUSES.NEEDS_ACTION },
          reviewer.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });

      const stored = await ttaRequestById(submitted.id);
      expect(stored.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(stored.notes).toHaveLength(1);
      expect(stored.reviewers[0].status).toBeNull();
      expect(await TtaRequestAssignedStaff.count({ where: { ttaRequestId: submitted.id } })).toBe(
        0
      );
    });

    it('rejects an approving COR who cannot approve in the region, without writing anything', async () => {
      const submitted = await submittedRequest();

      await expect(
        reviewTtaRequest(
          submitted,
          { ...assigned, status: APPROVER_STATUSES.APPROVED, approverId: staffMember.id },
          reviewer.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });

      const stored = await ttaRequestById(submitted.id);
      expect(stored.status).toBe(TTA_REQUEST_STATUSES.SUBMITTED);
      expect(stored.reviewers[0].status).toBeNull();
      expect(stored.approvers).toEqual([]);
      expect(stored.assignedStaff).toEqual([]);
    });

    it('lists requests awaiting approval', async () => {
      const submitted = await submittedRequest();
      await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.APPROVED, approverId: backupCor.id },
        reviewer.id
      );

      const { ttaRequest: scopes } = await filtersToScopes(
        { 'region.in': ['1'] },
        { userId: reviewer.id }
      );
      const { rows } = await getTtaRequests(scopes, reviewer.id);

      expect(rows.find((row) => row.id === submitted.id)?.status).toBe(
        TTA_REQUEST_STATUSES.AWAITING_APPROVAL
      );
    });

    it('lists requests sent back for changes', async () => {
      const submitted = await submittedRequest();
      await reviewTtaRequest(
        submitted,
        { ...assigned, status: APPROVER_STATUSES.NEEDS_ACTION },
        reviewer.id
      );

      const { ttaRequest: scopes } = await filtersToScopes(
        { 'region.in': ['1'] },
        { userId: reviewer.id }
      );
      const { rows } = await getTtaRequests(scopes, reviewer.id);

      expect(rows.find((row) => row.id === submitted.id)?.status).toBe(
        TTA_REQUEST_STATUSES.NEEDS_ACTION
      );
    });
  });

  describe('ttaRequestById', () => {
    it('returns null for a missing request', async () => {
      expect(await ttaRequestById(0)).toBeNull();
    });

    it('names the creator and reviewer with their roles', async () => {
      const grantsSpecialist = await Role.findOne({ where: { name: 'GS' } });
      await UserRole.create({ userId: creator.id, roleId: grantsSpecialist.id });
      const created = await createTtaRequest({ regionId: 1, reviewerId: reviewer.id }, creator.id);

      const found = await ttaRequestById(created.id);

      expect(found.creator.fullName).toBe(`${creator.name}, GS`);
      // the reviewer has no role, so it is just their name
      expect(found.reviewer.fullName).toBe(reviewer.name);
    });
  });

  describe('lockTtaRequest', () => {
    it('holds the row until the transaction ends', async () => {
      const created = await createTtaRequest({ regionId: 1 }, creator.id);

      await db.sequelize.transaction(async () => {
        await lockTtaRequest(created.id);

        // another transaction can't take the same lock while this one holds it
        const lockedElsewhere = await db.sequelize.transaction(async (other) =>
          TtaRequest.findByPk(created.id, {
            lock: other.LOCK.NO_KEY_UPDATE,
            skipLocked: true,
            transaction: other,
          })
        );
        expect(lockedElsewhere).toBeNull();
      });
    });
  });
});
