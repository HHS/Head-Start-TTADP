import { readFileSync } from 'fs';
import parse from 'csv-parse/lib/sync';
import {
  Role, Topic, RoleTopic, Goal, TopicGoal, Grantee, Grant, GrantGoal,
} from '../src/models';

function getItemId(array, item) {
  if (!array.includes(item)) {
    array.push(item);
  }
  const itemId = array.indexOf(item) + 1;
  return itemId;
}

function parseCsv(file) {
  let grantees = {};
  const csv = readFileSync(file);
  [...grantees] = parse(csv, {
    skipEmptyLines: true,
    columns: true,
  });
  return grantees;
}

/**
 * Processes data from .csv creating data arrays and then inserting it to the database
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
export default async function importGoals(file) {
  const grantees = parseCsv(file);
  try {
    const cleanRoles = [];
    const cleanTopics = [];
    const cleanRoleTopics = [];
    const cleanGoals = [];
    const cleanGrantees = [];
    const cleanGrantGoals = [];
    const cleanTopicGoals = [];
    const cleanGrants = [];

    await grantees.forEach((el, inx) => {
      let currentGrantee;
      let currentGranteeId;
      let grants;
      let currentGrants = [];
      let currentGoalName;
      let currentGoal = {};
      let currentGoalId;
      const currentGoals = [];

      Object.keys(el).forEach((key) => {
        if (key && key.trim().startsWith('Grantee (distinct')) {
          currentGrantee = el[key] ? el[key].split('|')[0] : `Unknown Grantee ${inx}`;
          currentGranteeId = getItemId(cleanGrantees, currentGrantee.trim());
          grants = el[key] ? el[key].split('|')[1] : `Unknown Grant ${inx}, Unknown Grant ${inx + 10000}`;
          currentGrants = grants.split(',');
        } else if (key && key.startsWith('Goal')) {
          const goalColumn = key.split(' ');
          let column;
          if (goalColumn.length === 2) { // Column name is "Goal X" representing goal's name
            currentGoalName = el[key].trim();
            currentGoal = { name: currentGoalName };
            currentGoalId = undefined;
            if (currentGoalName !== '') {
              const goalNum = goalColumn[1];
              currentGoals[goalNum] = { ...currentGoals[goalNum], ...currentGoal };
            }
          } else {
            // column will be either "topics", "timeframe" or "status"
            column = goalColumn[2].toLowerCase();
            if (column === 'topics') {
              const allTopics = el[key].split('\n');
              allTopics.forEach((topicPipeRoles) => {
                const topic = topicPipeRoles.split('|')[0];
                const roles = topicPipeRoles.split('|')[1];
                const trimmedTopic = topic.trim();
                if (trimmedTopic !== '') {
                  const topicId = getItemId(cleanTopics, trimmedTopic);
                  if (roles) {
                    const rolesArr = roles.split(',');
                    rolesArr.forEach((role) => {
                      const trimmedRole = role.trim();
                      const roleId = getItemId(cleanRoles, trimmedRole);
                      // associate topic with roles
                      if (!cleanRoleTopics.some((e) => e.roleId === roleId
                                                      && e.topicId === topicId)) {
                        cleanRoleTopics.push({ roleId, topicId });
                      }
                    });
                  }
                  // Add topic to junction with goal
                  currentGoalId = cleanGoals.length + currentGoals.length - 1; // -1 because there is a dummy element at index 0
                  cleanTopicGoals.push({ topicId, goalId: currentGoalId });
                }
              });
            } else // it's either "timeframe" or "status"
            // both "timeframe" and "status" column names will be reused as goal's object keys
            if (currentGoalName !== '') {
              currentGoal[column] = el[key].trim();
              const goalNum = goalColumn[1].slice(0, 1); // represents a goal number from 1 to 5
              currentGoals[goalNum] = { ...currentGoals[goalNum], ...currentGoal };
            }
          }
        }
      });

      // after each row
      let goalId;
      let grantId;

      currentGoals.forEach((goal) => {
        cleanGoals.push(goal);
        goalId = cleanGoals.length;
        currentGranteeId = getItemId(cleanGrantees, currentGrantee.trim());
        currentGrants.forEach((grant) => {
          const fullGrant = { number: grant.trim(), granteeId: currentGranteeId };
          if (!cleanGrants.some((e) => e.granteeId === fullGrant.granteeId
                            && e.number === fullGrant.number)) {
            cleanGrants.push(fullGrant);
          }
          grantId = cleanGrants.findIndex((g) => g.number === fullGrant.number) + 1;
          const plan = { granteeId: currentGranteeId, grantId, goalId };
          if (!cleanGrantGoals.some((e) => e.granteeId === currentGranteeId
                            && e.grantId === grantId
                            && e.goalId === goalId)) {
            cleanGrantGoals.push(plan);
          }
        });
      });
    });

    // The data has been prepared. Insert it into the database
    await Role.bulkCreate(cleanRoles.map((role, index) => (
      { id: index + 1, name: role })),
    {
      updateOnDuplicate: ['name', 'updatedAt'],
    });
    await Topic.bulkCreate(cleanTopics.map((topic, index) => (
      { id: index + 1, name: topic })),
    {
      updateOnDuplicate: ['name', 'updatedAt'],
    });
    await RoleTopic.bulkCreate(cleanRoleTopics,
      {
        ignoreDuplicates: true,
      });
    await Goal.bulkCreate(cleanGoals.map((goal, index) => (
      { id: index + 1, ...goal, isFromSmartsheetTtaPlan: true })),
    {
      updateOnDuplicate: ['name', 'updatedAt'],
    });
    await TopicGoal.bulkCreate(cleanTopicGoals, {
      ignoreDuplicates: true,
    });
    await Grantee.bulkCreate(cleanGrantees.map((grantee, index) => (
      { id: index + 1, name: grantee })),
    {
      updateOnDuplicate: ['name', 'updatedAt'],
    });
    await Grant.bulkCreate(cleanGrants.map((grant, index) => (
      { id: index + 1, number: grant.number, granteeId: grant.granteeId })),
    {
      updateOnDuplicate: ['number', 'granteeId', 'updatedAt'],
    });
    await GrantGoal.bulkCreate(cleanGrantGoals,
      {
        ignoreDuplicates: true,
      });
  } catch (err) {
    console.log(err);
  }
}
