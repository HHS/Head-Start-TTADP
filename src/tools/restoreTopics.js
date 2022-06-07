/* eslint-disable no-restricted-syntax */
import {
  sequelize,
  Topic,
  TopicGoal,
} from '../models';
import topicData from './restoreTopics.Topics';
import topicGoalData from './restoreTopics.TopicGoals';

/**
 * changeReportStatus script changes status of activity reports based on ids and status.
 * The script expects a comma separated ids and the new status.
 */

export default async function restoreTopics() {
  await sequelize.transaction(async (transaction) => {
    try {
      const loggedUser = '0';
      // const transactionId = '';
      const sessionSig = __filename;
      const auditDescriptor = 'RUN TOOLS';
      await sequelize.query(
        `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction },
      );
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      throw (err);
    }

    const topicCollisions = await Topic.findAll({
      where: { id: topicData.map((td) => td.id) },
      transaction,
    });

    if (topicCollisions.length > 0) {
      throw new Error('original topics will collide with currently loaded ones.');
    }

    // Disable logging while doing mass updates
    try {
      await sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction },
      );
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      throw (err);
    }

    await Promise.all(topicData.map(async (td) => Topic.create({ ...td }, { transaction })));

    await sequelize.query(
      `
      PERFORM setval('"Topics_id_seq"', max(id)+1) FROM "Topics";
      `,
      { transaction },
    );

    await Promise.all(topicGoalData.map(async (tgd) => {
      const topic = await Topic.findOne({
        where: { id: tgd.topicId },
        transaction,
      });

      const topicGoal = await TopicGoal.findOrCreate({
        where: { topicId: topic.mapsTo, goalId: tgd.goalId },
        default: { ...tgd },
        transaction,
      });

      await TopicGoal.update(
        {
          createdAt: sequelize.fn('LEAST', topicGoal.createdAt, tgd.createdAt),
          updatedAt: sequelize.fn('GREATEST', topicGoal.updatedAt, tgd.updatedAt),
        },
        {
          where: { id: topicGoal.id },
          transaction,
        },
      );

      await sequelize.query(
        `
        PERFORM setval('"TopicGoals_id_seq"', max(id)+1) FROM "TopicGoals";
        `,
        { transaction },
      );
    }));

    // Disable logging while doing mass updates
    try {
      await sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction },
      );
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      throw (err);
    }
  });
}
