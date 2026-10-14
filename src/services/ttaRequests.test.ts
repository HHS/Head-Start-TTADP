import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { createGoalTemplate, createGrant, createRecipient, createUser } from '../testUtils';
import {
  createTtaRequest,
  TtaRequestDataError,
  ttaRequestById,
  updateTtaRequest,
} from './ttaRequests';

const { Goal, Grant, GoalTemplate, Permission, Recipient, TtaRequest, TtaRequestCitation, User } =
  db;

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
      // the reviewer approves in region 1, where these requests are
      Permission.create({ userId: reviewer.id, regionId: 1, scopeId: SCOPES.APPROVE_REPORTS }),
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
    await Permission.destroy({ where: { userId: [creator.id, reviewer.id] } });
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
      ).rejects.toThrow(TtaRequestDataError);
    });

    it('rejects a grant belonging to another recipient', async () => {
      await expect(
        createTtaRequest(
          { regionId: 1, recipientId: recipient.id, grantIds: [otherRecipientGrant.id] },
          creator.id
        )
      ).rejects.toThrow(TtaRequestDataError);
    });

    it('rejects grants without a recipient', async () => {
      await expect(
        createTtaRequest({ regionId: 1, grantIds: [grantOne.id] }, creator.id)
      ).rejects.toThrow(TtaRequestDataError);
    });

    it('drops a reviewer who is not an approver in the region', async () => {
      const saved = await createTtaRequest({ regionId: 1, reviewerId: creator.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });

    it('drops a reviewer who approves in another region', async () => {
      const saved = await createTtaRequest({ regionId: 2, reviewerId: reviewer.id }, creator.id);
      expect(saved.reviewerId).toBeNull();
    });

    it('rejects a recipient with no grants in the region', async () => {
      await expect(
        createTtaRequest({ regionId: 3, recipientId: recipient.id }, creator.id)
      ).rejects.toThrow(TtaRequestDataError);
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
      ).rejects.toThrow(TtaRequestDataError);
    });
  });

  describe('updateTtaRequest reviewer', () => {
    it('saves an approver in the region as the reviewer', async () => {
      const created = await createTtaRequest({ regionId: 1 }, creator.id);
      const updated = await updateTtaRequest(created, { reviewerId: reviewer.id }, creator.id);
      expect(updated.reviewer.id).toBe(reviewer.id);
    });

    it('drops a reviewer who is not an approver in the region', async () => {
      const created = await createTtaRequest({ regionId: 1, reviewerId: reviewer.id }, creator.id);
      const updated = await updateTtaRequest(created, { reviewerId: creator.id }, creator.id);
      expect(updated.reviewerId).toBeNull();
    });
  });

  describe('ttaRequestById', () => {
    it('returns null for a missing request', async () => {
      expect(await ttaRequestById(0)).toBeNull();
    });
  });
});
