/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
import {
  sequelize,
  Topic,
  TopicGoal,
} from '../models';
import topicData from './restoreTopics.Topics';
import topicGoalData from './restoreTopics.TopicGoals';

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
      paranoid: false,
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
      `DO $$ BEGIN
        PERFORM SETVAL('"Topics_id_seq"', MAX(id)+1) FROM "Topics";
      END$$;`,
      { transaction },
    );

    const topicMappings = await Topic.findAll({
      attributes: [
        ['id', 'topicId'],
        ['mapsTo', 'mapsTo'],
      ],
      where: { deletedAt: { [Op.not]: null } },
      order: ['id'],
      paranoid: false,
      transaction,
    });

    const processedTopicGoalDataPass1 = topicGoalData
      .map((tgd) => {
        const { topicId, ...newTgd } = tgd;
        const tm = topicMappings.find((t) => t.get('topicId') === topicId);
        if (tm) {
          newTgd.topicId = tm.get('mapsTo');
        } else {
          newTgd.topicId = null;
        }
        return newTgd;
      })
      .filter((tgd) => tgd.topicId !== null);
    const processedTopicGoalDataPass2 = processedTopicGoalDataPass1
      .map((tgd) => {
        const { createdAt, updatedAt, ...newTgd } = tgd;
        const matching = processedTopicGoalDataPass1
          .filter((x) => x.goalId === newTgd.goalId && x.topicId === newTgd.topicId);
        const createdAts = matching.map((m) => m.createdAt);
        const updatedAts = matching.map((m) => m.updatedAt);
        createdAts.sort();
        updatedAts.sort();
        // eslint-disable-next-line prefer-destructuring
        newTgd.createdAt = createdAts[0];
        newTgd.updatedAt = updatedAts[updatedAts.length - 1];
        return newTgd;
      })
      .filter((x, i, a) => a
        .findIndex((ax) => ax.goalId === x.goalId && ax.topicId === x.topicId) === i);

    await Promise.all(processedTopicGoalDataPass2.map(async (tgd) => {
      try {
        const topicGoal = await TopicGoal.findOne({
          where: { topicId: tgd.topicId, goalId: tgd.goalId },
          transaction,
        });

        if (topicGoal) {
          if (topicGoal.createdAt > tgd.createdAt) {
            topicGoal.createdAt = tgd.createdAt;
          }
          if (topicGoal.updatedAt < tgd.updatedAt) {
            topicGoal.updatedAt = tgd.updatedAt;
          }
          await topicGoal.save({ transaction });
        } else {
          if (tgd.topicId === null) {
            throw new Error('topicId must not be null');
          }
          await TopicGoal.create({ ...tgd }, { transaction });
        }
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      await sequelize.query(
        `DO $$ BEGIN
          PERFORM SETVAL('"TopicGoals_id_seq"', MAX(id)+1) FROM "TopicGoals";
        END$$;`,
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
