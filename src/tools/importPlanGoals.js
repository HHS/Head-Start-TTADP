/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { downloadFile } from '../lib/s3';
import {
  Role, Topic, RoleTopic, Goal, TopicGoal, Grant, GrantGoal,
} from '../models';

const hubRoles = [
  { name: 'RPM', fullName: 'Regional Program Manager' },
  { name: 'COR', fullName: 'Contracting Officer\'s Representative' },
  { name: 'SPS', fullName: 'Supervisory Program Specialist' },
  { name: 'PS', fullName: 'Program Specialist' },
  { name: 'GS', fullName: 'Grants Specialist' },
  { name: 'CO', fullName: 'Central Office: TTA and Comprehensive Services Division' },
  { name: 'CO', fullName: 'Central Office: Other Divisions' },
  { name: 'TTAC', fullName: 'TTAC' },
  { name: 'AA', fullName: 'Admin. Assistant' },
  { name: 'ECM', fullName: 'Early Childhood Manager' },
  { name: 'ECS', fullName: 'Early Childhood Specialist' },
  { name: 'FES', fullName: 'Family Engagement Specialist' },
  { name: 'GSM', fullName: 'Grantee Specialist Manager' },
  { name: 'GS', fullName: 'Grantee Specialist' },
  { name: 'HS', fullName: 'Health Specialist' },
  { name: 'SS', fullName: 'System Specialist' },
];

async function parseCsv(fileKey) {
  let recipients = {};
  const { Body: csv } = await downloadFile(fileKey);
  [...recipients] = parse(csv, {
    skipEmptyLines: true,
    columns: true,
  });
  return recipients;
}

async function prePopulateRoles() {
  await Role.bulkCreate(
    hubRoles,
    {
      updateOnDuplicate: ['updatedAt'],
    },
  );
}

const grantNumRE = /\s(?<grantNumber>[0-9]{2}[A-Z]{2}[0-9]+)(?:[,\s]|$)/g;
const parseGrantNumbers = (value) => {
  const matchIter = value.matchAll(grantNumRE);
  const results = [];
  for (const { groups: { grantNumber } } of matchIter) {
    if (grantNumber) {
      results.push(grantNumber);
    }
  }
  return results;
};

/**
 * Processes data from .csv inserting the data during the processing as well as
 * creating data arrays for associations and then inserting them to the database
 *
 * The incomeing .csv data is a series of rows with relevant data in the following format
 *
 * Grantee (distinct by row number): 'Grantee Name | Grant1 [, Grant2]'
 * Goal 1: 'Name of the goal, e.g. Identify strategies...'
 * Goal 1 Status: 'Status, e.g. Not Started'
 * Goal 1 Topics: 'Behavioral /Mental Health | HS, FES'
 * Goal 1 Timeframe: '6 months'
 * Goal 2: 'Enhance reflective practice'
 * Goal 2 Status: 'Not Started'
 * Goal 2: Topics: 'Other'
 * Goal 2: Timeframe: '6 months'
 * ...
 * (Total 5 goals. Some of them could be empty)
 */
export default async function importGoals(fileKey, region) {
  const recipients = await parseCsv(fileKey);
  const regionId = region;
  try {
    const cleanRoleTopics = [];
    const cleanGrantGoals = [];
    const cleanTopicGoals = [];

    await prePopulateRoles();

    for await (const el of recipients) {
      let currentGrants = [];
      const currentGoals = [];
      let currentGoalName = '';
      let currentGoalNum = 0;

      for await (const key of Object.keys(el)) {
        if (key && (key.trim().startsWith('Grantee (distinct') || key.trim().startsWith('Grantee Name'))) {
          currentGrants = parseGrantNumbers(el[key]);
        } else if (key && key.startsWith('Goal')) {
          const goalColumn = key.split(' ');
          let column;
          if (goalColumn.length === 2) { // Column name is "Goal X" representing goal's name
            currentGoalName = el[key].trim();
            if (currentGoalName.match(/(no goals?|none)( identified)? at this time\.?/i)) {
              currentGoalName = '';
            }
            if (currentGoalName !== '') { // Ignore empty goals
              // eslint-disable-next-line prefer-destructuring
              currentGoalNum = goalColumn[1];
              currentGoals[currentGoalNum] = {
                ...currentGoals[currentGoalNum],
                name: currentGoalName,
              };
            }
          } else if (currentGoalName !== '') {
            // column will be either "topics", "timeframe" or "status"
            column = goalColumn[2].toLowerCase();
            if (column === 'topics') {
              const allTopics = el[key].split('\n');
              for await (const topicPipeRoles of allTopics) {
                const topic = topicPipeRoles.split('|')[0];
                const roles = topicPipeRoles.split('|')[1];
                const trimmedTopic = topic.trim();
                if (trimmedTopic !== '') {
                  const [dbTopic] = await Topic.findOrCreate({ where: { name: trimmedTopic } });
                  const topicId = dbTopic.id;
                  if (roles) {
                    const rolesArr = roles.split(',');
                    for await (const role of rolesArr) {
                      const trimmedRole = role.trim();
                      let roleId;
                      if (trimmedRole === 'GS') { // Special case for 'GS' since it's non-unique
                        const [dbRole] = await Role.findOrCreate({ where: { name: trimmedRole, fullName: 'Grantee Specialist' } });
                        roleId = dbRole.id;
                      } else {
                        const [dbRole] = await Role.findOrCreate({ where: { name: trimmedRole } });
                        roleId = dbRole.id;
                      }
                      // associate topic with roles
                      if (!cleanRoleTopics.some((e) => e.roleId === roleId
                                                      && e.topicId === topicId)) {
                        cleanRoleTopics.push({ roleId, topicId });
                      }
                    }
                  }
                  // Add topic to junction with goal
                  cleanTopicGoals.push(
                    { topicId, goalName: currentGoalName },
                  ); // we don't have goal's id at this point yet
                }
              }
            } else {
              // it's either "timeframe" or "status"
              // both "timeframe" and "status" column names will be reused as goal's object keys
              currentGoals[currentGoalNum] = {
                ...currentGoals[currentGoalNum],
                [column]: el[key].trim(),
              };
            }
          }
        }
      }

      // after each row
      let goalId;
      let grantId;
      let currentRecipientId;

      for await (const goal of currentGoals) {
        if (goal) { // ignore the dummy element at index 0
          const [dbGoal] = await Goal.findOrCreate({
            where: { name: goal.name, isFromSmartsheetTtaPlan: true },
            defaults: goal,
          });
          goalId = dbGoal.id;
          // add goal id to cleanTopicGoals
          cleanTopicGoals.forEach((tp) => {
            if (tp.goalName === dbGoal.name) {
              // eslint-disable-next-line no-param-reassign
              tp.goalId = goalId;
            }
          });
          for await (const grant of currentGrants) {
            const fullGrant = { number: grant.trim(), regionId };
            const dbGrant = await Grant.findOne({ where: { ...fullGrant }, attributes: ['id', 'recipientId'] });
            if (!dbGrant) {
              // eslint-disable-next-line no-console
              console.log(`Couldn't find grant: ${fullGrant.number}. Exiting...`);
              throw new Error('error');
            }
            grantId = dbGrant.id;
            currentRecipientId = dbGrant.recipientId;
            const plan = { recipientId: currentRecipientId, grantId, goalId };
            if (!cleanGrantGoals.some((e) => e.recipientId === currentRecipientId
                            && e.grantId === grantId
                            && e.goalId === goalId)) {
              cleanGrantGoals.push(plan);
            }
          }
        }
      }
    }

    // The associations data has been prepared. Insert it into the database
    await RoleTopic.bulkCreate(
      cleanRoleTopics,
      {
        ignoreDuplicates: true,
      },
    );
    await TopicGoal.bulkCreate(cleanTopicGoals, {
      ignoreDuplicates: true,
    });
    await GrantGoal.bulkCreate(
      cleanGrantGoals,
      {
        ignoreDuplicates: true,
      },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
  }
}
