import { readFileSync } from 'fs';
import parse from 'csv-parse/lib/sync';
import { option } from 'yargs';
import {
  Role, Topic, RoleTopic, Goal, TopicGoal, Grantee, Ttaplan,
} from '../src/models';

let grantees;

function getItemId(array, item) {
  if (!array.includes(item)) {
    array.push(item);
  }
  const itemId = array.indexOf(item) + 1;
  return itemId;
}

/**
 * Processes data from .csv creating data arrays and then inserting it to the database
 */
async function importGoals() {
  try {
    const cleanRoles = [];
    const cleanTopics = [];
    const cleanRoleTopics = [];
    const cleanGoals = [];
    const cleanGrantees = [];
    const cleanTtaPlans = [];
    const cleanTopicGoals = [];

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
        if (key && key.startsWith('Grantee (distinct')) {
          currentGrantee = el[key] ? el[key].split('|')[0] : `Unknown Grantee ${inx}`;
          currentGranteeId = getItemId(cleanGrantees, currentGrantee.trim());
          grants = el[key] ? el[key].split('|')[1] : `Unknown Grant ${inx}, Unknown Grant ${inx + 10000}`;
          currentGrants = grants.split(',');
        } else if (key && key.startsWith('Goal')) {
          const goalColumn = key.split(' ');
          let column;
          if (goalColumn.length > 2) {
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
            } else // it's either timeframe or status}
            if (currentGoalName !== '') {
              currentGoal[column] = el[key].trim();
              const goalNum = goalColumn[1].slice(0, 1);
              currentGoals[goalNum] = { ...currentGoals[goalNum], ...currentGoal };
            }
          } else { // we have a goal name
            currentGoalName = el[key].trim();
            currentGoal = { name: currentGoalName };
            currentGoalId = undefined;
            if (currentGoalName !== '') {
              const goalNum = goalColumn[1];
              currentGoals[goalNum] = { ...currentGoals[goalNum], ...currentGoal };
            }
          }
        }
      });

      // after each row
      let goalId;
      currentGoals.forEach((goal) => {
        cleanGoals.push(goal);
        goalId = cleanGoals.length;
        currentGranteeId = getItemId(cleanGrantees, currentGrantee.trim());
        currentGrants.forEach((grant) => {
          const plan = { granteeId: currentGranteeId, grant, goalId };
          if (!cleanTtaPlans.some((e) => e.granteeId === currentGranteeId
                            && e.grant === grant
                            && e.goalId === goalId)) {
            cleanTtaPlans.push(plan);
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
      { id: index + 1, ...goal })),
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
    await Ttaplan.bulkCreate(cleanTtaPlans,
      {
        ignoreDuplicates: true,
      });
  } catch (err) {
    console.log(err);
  }
}

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
})
  .help()
  .alias('help', 'h');

const defaultInputFile = './GranteeTTAPlan.csv';

let file;
if (argv.file) {
  // console.log('The current file is: ', argv.file);
  file = argv.file;
}

const csv = readFileSync(file || defaultInputFile);
[, ...grantees] = parse(csv, {
  relax_column_count: true,
  columns: true,
});

importGoals();
