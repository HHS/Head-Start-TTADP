import { REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { v4 as uuid } from 'uuid';
import db from '../../models';
import { createGrant, createReport, destroyReport, getUniqueId } from '../../testUtils';
import { withoutTopics, withTopics } from './topic';

const { GrantCitation } = db;

describe('grantCitation/topic', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  const validTopics = new Set(['Coaching', 'ERSEA']);

  describe('withTopics', () => {
    it('restricts citationId to a subquery scoped to the requested valid topics', () => {
      const where = withTopics(['Coaching'], {}, 1, validTopics);
      const literal = where.citationId[Op.in].val;

      expect(literal).toContain('SELECT DISTINCT aroc."citationId"');
      expect(literal).toContain("t.name IN ('Coaching')");
    });

    it('drops topics that are not in the valid topics set', () => {
      const where = withTopics(['Coaching', 'Not A Real Topic'], {}, 1, validTopics);
      const literal = where.citationId[Op.in].val;

      expect(literal).toContain("t.name IN ('Coaching')");
      expect(literal).not.toContain('Not A Real Topic');
    });

    it('returns an empty match when no valid topics remain', () => {
      expect(withTopics(['Not A Real Topic'], {}, 1, validTopics)).toEqual({
        citationId: { [Op.in]: [] },
      });
    });

    it('returns an empty match when validTopics is not provided', () => {
      expect(withTopics(['Coaching'], {}, 1, undefined)).toEqual({
        citationId: { [Op.in]: [] },
      });
    });
  });

  describe('withoutTopics', () => {
    it('excludes citationId matching a subquery scoped to the requested valid topics', () => {
      const where = withoutTopics(['ERSEA'], {}, 1, validTopics);
      const literal = where.citationId[Op.notIn].val;

      expect(literal).toContain('SELECT DISTINCT aroc."citationId"');
      expect(literal).toContain("t.name IN ('ERSEA')");
    });

    it('returns no filter when no valid topics remain', () => {
      expect(withoutTopics(['Not A Real Topic'], {}, 1, validTopics)).toEqual({});
    });
  });

  describe('report status filtering (integration)', () => {
    const topicName = `Coaching-${getUniqueId()}`;
    const integrationValidTopics = new Set([topicName]);
    let grant;
    let topic;
    let draftReport;
    let approvedReport;
    let draftOnlyCitation;
    let sharedCitation;
    let grantCitationIds;

    const createCitation = async () =>
      db.Citation.create({
        mfid: getUniqueId(),
        finding_uuid: uuid(),
      });

    const linkTopicToReport = async ({ report, citationId, topicId }) => {
      const goal = await db.Goal.create({ grantId: grant.id, name: 'goal' });
      const objective = await db.Objective.create({ goalId: goal.id, title: 'objective' });
      const aro = await db.ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objective.id,
      });
      await db.ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro.id,
        topicId,
      });
      await db.ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aro.id,
        citationId,
        citation: '1302.1',
        grantNumber: grant.number,
        findingId: uuid(),
        grantId: grant.id,
        reviewName: 'review',
        standardId: 1,
        findingType: 'finding',
        acro: 'acro',
        name: 'acro - 1302.1',
        severity: 1,
        reportDeliveryDate: '2025-01-01',
        monitoringFindingStatusName: 'Active',
      });
    };

    beforeAll(async () => {
      grant = await createGrant({});
      topic = await db.Topic.create({ name: topicName });

      draftReport = await createReport({
        activityRecipients: [{ grantId: grant.id }],
        calculatedStatus: REPORT_STATUSES.DRAFT,
      });
      approvedReport = await createReport({
        activityRecipients: [{ grantId: grant.id }],
        calculatedStatus: REPORT_STATUSES.APPROVED,
      });

      draftOnlyCitation = await createCitation();
      await linkTopicToReport({
        report: draftReport,
        citationId: draftOnlyCitation.id,
        topicId: topic.id,
      });

      sharedCitation = await createCitation();
      await linkTopicToReport({
        report: draftReport,
        citationId: sharedCitation.id,
        topicId: topic.id,
      });
      await linkTopicToReport({
        report: approvedReport,
        citationId: sharedCitation.id,
        topicId: topic.id,
      });

      const grantCitations = await GrantCitation.bulkCreate([
        { grantId: grant.id, citationId: draftOnlyCitation.id },
        { grantId: grant.id, citationId: sharedCitation.id },
      ]);
      grantCitationIds = grantCitations.map((gc) => gc.id);
    });

    afterAll(async () => {
      await GrantCitation.destroy({ where: { id: grantCitationIds ?? [] }, force: true });
      await db.ActivityReportObjectiveCitation.destroy({
        where: { citationId: [draftOnlyCitation?.id, sharedCitation?.id].filter(Boolean) },
      });
      await db.ActivityReportObjectiveTopic.destroy({ where: { topicId: topic?.id } });
      await db.ActivityReportObjective.destroy({
        where: { activityReportId: [draftReport?.id, approvedReport?.id].filter(Boolean) },
      });
      await db.Objective.destroy({
        where: {
          goalId: (await db.Goal.findAll({ where: { grantId: grant?.id } })).map((g) => g.id),
        },
        force: true,
      });
      await db.Goal.destroy({ where: { grantId: grant?.id }, force: true });
      await db.Citation.destroy({
        where: { id: [draftOnlyCitation?.id, sharedCitation?.id].filter(Boolean) },
      });
      await db.Topic.destroy({ where: { id: topic?.id }, force: true });
      if (draftReport) await destroyReport(draftReport);
      if (approvedReport) await destroyReport(approvedReport);
    });

    const matchingCitationIds = async (where) => {
      const matches = await GrantCitation.findAll({
        where: { [Op.and]: [where, { id: grantCitationIds }] },
      });
      return matches.map((m) => m.citationId);
    };

    it('does not match a citation whose topic only appears on a draft report', async () => {
      const where = withTopics([topicName], {}, 1, integrationValidTopics);
      expect(await matchingCitationIds(where)).not.toContain(draftOnlyCitation.id);
    });

    it('treats a draft-only match as absent under "not" filtering', async () => {
      const where = withoutTopics([topicName], {}, 1, integrationValidTopics);
      expect(await matchingCitationIds(where)).toContain(draftOnlyCitation.id);
    });

    it('matches a citation shared between a draft and an approved report via the approved link', async () => {
      const where = withTopics([topicName], {}, 1, integrationValidTopics);
      expect(await matchingCitationIds(where)).toContain(sharedCitation.id);
    });

    it('does not exclude a shared citation under "not" filtering since it has an approved match', async () => {
      const where = withoutTopics([topicName], {}, 1, integrationValidTopics);
      expect(await matchingCitationIds(where)).not.toContain(sharedCitation.id);
    });
  });
});
