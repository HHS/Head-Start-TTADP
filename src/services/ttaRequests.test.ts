import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import filtersToScopes from '../scopes';
import { createGoalTemplate, createGrant, createRecipient, createUser } from '../testUtils';
import {
  createTtaRequest,
  getTtaRequests,
  lockTtaRequest,
  submitTtaRequest,
  ttaRequestById,
  ttaRequestReviewers,
  updateTtaRequest,
} from './ttaRequests';

const {
  Goal,
  Grant,
  GoalTemplate,
  Permission,
  Recipient,
  Role,
  TtaRequest,
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

  beforeAll(async () => {
    [creator, reviewer, recipient, otherRecipient, goalTemplate] = await Promise.all([
      createUser({}),
      createUser({}),
      createRecipient({}),
      createRecipient({}),
      createGoalTemplate(),
    ]);

    [grantOne, grantTwo, otherRegionGrant, otherRecipientGrant] = await Promise.all([
      createGrant({ recipientId: recipient.id, regionId: 1 }),
      createGrant({ recipientId: recipient.id, regionId: 1 }),
      createGrant({ recipientId: recipient.id, regionId: 2 }),
      createGrant({ recipientId: otherRecipient.id, regionId: 1 }),
      // the reviewer is active and can write in region 1, where these requests are
      Permission.create({ userId: reviewer.id, regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS }),
      Permission.create({ userId: reviewer.id, regionId: 14, scopeId: SCOPES.SITE_ACCESS }),
    ]);

    const ttac = await Role.findOne({ where: { name: 'TTAC' } });
    await UserRole.create({ userId: reviewer.id, roleId: ttac.id });
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
    await Permission.destroy({ where: { userId: [creator.id, reviewer.id] } });
    await UserRole.destroy({ where: { userId: [creator.id, reviewer.id] } });
    await User.destroy({ where: { id: [creator.id, reviewer.id] } });
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
    let noRole;
    let otherRole;
    let readOnly;
    let approveOnly;
    let otherRegion;
    let twoRoles;
    let inactive;

    const giveRoles = async (userId: number, names: string[]) => {
      const roles = await Role.findAll({ where: { name: names } });
      await UserRole.bulkCreate(roles.map((role) => ({ userId, roleId: role.id })));
    };

    const permit = (userId: number, scopeId: number, regionId = 1) =>
      Permission.create({ userId, regionId, scopeId });

    beforeAll(async () => {
      [noRole, otherRole, readOnly, approveOnly, otherRegion, twoRoles, inactive] =
        await Promise.all(Array.from({ length: 7 }, () => createUser({})));

      // everyone but the inactive user can sign in
      const active = [noRole, otherRole, readOnly, approveOnly, otherRegion, twoRoles];

      await Promise.all([
        ...active.map((user) => permit(user.id, SCOPES.SITE_ACCESS, 14)),
        permit(noRole.id, SCOPES.READ_WRITE_REPORTS),
        permit(otherRole.id, SCOPES.READ_WRITE_REPORTS),
        giveRoles(otherRole.id, ['COR']),
        permit(readOnly.id, SCOPES.READ_REPORTS),
        giveRoles(readOnly.id, ['RPM']),
        permit(approveOnly.id, SCOPES.APPROVE_REPORTS),
        giveRoles(approveOnly.id, ['ECM']),
        permit(otherRegion.id, SCOPES.READ_WRITE_REPORTS, 2),
        giveRoles(otherRegion.id, ['GS']),
        permit(twoRoles.id, SCOPES.READ_WRITE_REPORTS),
        giveRoles(twoRoles.id, ['GSM', 'SS']),
        permit(inactive.id, SCOPES.READ_WRITE_REPORTS),
        giveRoles(inactive.id, ['TTAC']),
      ]);
    });

    afterAll(async () => {
      const ids = [noRole, otherRole, readOnly, approveOnly, otherRegion, twoRoles, inactive].map(
        (u) => u.id
      );
      await Permission.destroy({ where: { userId: ids } });
      await UserRole.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
    });

    it('lists users who can write in the region with a reviewing role, once each', async () => {
      const reviewers = await ttaRequestReviewers(1);
      const ids = reviewers.map((u) => u.id);

      expect(ids).toContain(reviewer.id);
      expect(ids.filter((id) => id === twoRoles.id)).toHaveLength(1);
    });

    it('leaves out inactive users and those without both write permission in the region and a reviewing role', async () => {
      const ids = (await ttaRequestReviewers(1)).map((u) => u.id);

      [noRole, otherRole, readOnly, approveOnly, otherRegion, inactive, creator].forEach((user) => {
        expect(ids).not.toContain(user.id);
      });
    });

    it('drops a saved reviewer who has a reviewing role but cannot write in the region', async () => {
      const saved = await createTtaRequest({ regionId: 1, reviewerId: approveOnly.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
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

    it('rejects the monitoring goal without citations', async () => {
      const draft = await createTtaRequest({ regionId: 1 }, creator.id);

      await expect(
        submitTtaRequest(draft, { ...complete, goalTemplateId: monitoringTemplate.id }, creator.id)
      ).rejects.toMatchObject({ statusCode: 400 });
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
      expect(found.reviewer.fullName).toBe(`${reviewer.name}, TTAC`);
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
