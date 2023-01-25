import { processObjectiveForResourcesById, getResourcesForObjectives } from '../resources';
import db, {
  Objective,
  ObjectiveResource,
  ObjectiveFile,
  Topic,
  ObjectiveTopic,
} from '../../models';
import { saveObjectiveAssociations } from '../goals';
import { OBJECTIVE_STATUS } from '../../constants';

describe('saveObjectiveAssociations', () => {
  describe('should save objective associations', () => {
    let existingObjective;
    let topic1;
    let topic2;
    let resource;

    beforeAll(async () => {
      existingObjective = await Objective.create({
        title: 'Objective 1',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      });
      processObjectiveForResourcesById(existingObjective.id, ['https://example.com']);
      [resource] = await getResourcesForObjectives(existingObjective.id);

      topic1 = await Topic.create({
        name: 'Dancing in the moonlight',
      });

      topic2 = await Topic.create({
        name: 'Dancing in the daylight',
      });

      await ObjectiveTopic.create({
        objectiveId: existingObjective.id,
        topicId: topic1.id,
      });
    });

    afterAll(async () => {
      await ObjectiveResource.destroy({
        where: {
          objectiveId: [existingObjective.id],
        },
      });

      await ObjectiveTopic.destroy({
        where: {
          objectiveId: [existingObjective.id],
        },
      });

      await Objective.destroy({
        where: {
          id: [existingObjective.id],
        },
      });

      await Topic.destroy({
        where: {
          id: [topic1.id, topic2.id],
        },
      });

      await db.sequelize.close();
    });

    it('should save new associations and update old ones', async () => {
      const resources = [
        {
          key: resource.id,
          value: resource.resource.url,
        },
        {
          key: 'new-resource',
          value: 'http://www.example2.com',
        },
      ];

      const topics = [{
        id: topic1.id,
      }];
      const files = [];
      await saveObjectiveAssociations(
        existingObjective,
        resources,
        topics,
        files,
        true,
      );

      const savedResources = await ObjectiveResource.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedResources.length).toEqual(2);
      const urls = savedResources.map((r) => r.userProvidedUrl);
      expect(urls).toContain('http://www.example2.com');
      expect(urls).toContain('https://example.com');

      const savedTopics = await ObjectiveTopic.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedTopics.length).toEqual(1);
      expect(savedTopics[0].topicId).toEqual(topic1.id);

      const savedFiles = await ObjectiveFile.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedFiles.length).toEqual(0);
    });

    it('should delete unused associations and save used ones', async () => {
      let savedResources = await ObjectiveResource.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedResources.length).toEqual(2);
      let urls = savedResources.map((r) => r.userProvidedUrl);
      expect(urls).toContain('http://www.example2.com');
      expect(urls).toContain('https://example.com');

      let savedTopics = await ObjectiveTopic.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedTopics.length).toEqual(1);
      expect(savedTopics[0].topicId).toEqual(topic1.id);

      let savedFiles = await ObjectiveFile.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedFiles.length).toEqual(0);

      const resources = [
        {
          key: resource.id,
          value: resource.resource.url,
        },
      ];

      const topics = [{
        id: topic1.id,
      }, { id: topic2.id }];
      const files = [];

      await saveObjectiveAssociations(
        existingObjective,
        resources,
        topics,
        files,
        true,
      );

      savedResources = await ObjectiveResource.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedResources.length).toEqual(1);
      urls = savedResources.map((r) => r.userProvidedUrl);
      expect(urls).toContain('https://example.com');

      savedTopics = await ObjectiveTopic.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedTopics.length).toEqual(2);
      const topicIds = savedTopics.map((t) => t.topicId);
      expect(topicIds).toContain(topic1.id);
      expect(topicIds).toContain(topic2.id);

      savedFiles = await ObjectiveFile.findAll({
        where: {
          objectiveId: existingObjective.id,
        },
      });

      expect(savedFiles.length).toEqual(0);
    });
  });
});
