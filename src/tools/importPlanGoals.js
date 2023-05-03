/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { GOAL_STATUS } from '../constants';
import { downloadFile } from '../lib/s3';
import {
  Goal,
  Grant,
} from '../models';
import { logger } from '../logger';

async function parseCsv(fileKey) {
  let recipients = {};
  const { Body: csv } = await downloadFile(fileKey);
  [...recipients] = parse(csv, {
    skipEmptyLines: true,
    columns: true,
  });
  return recipients;
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
 * Updates status of the existing goal based on whether the incoming
 * status is considered to be a step forward
 *
 * @param {Object} goal - goal being imported
 * @param {Object} dbgoal - existing goal
 */
export async function updateStatus(goal, dbgoal) {
  const dbGoalStatusIdx = Object.values(GOAL_STATUS).indexOf(dbgoal.status);
  const goalStatusIdx = Object.values(GOAL_STATUS).indexOf(goal.status);

  if (dbGoalStatusIdx < goalStatusIdx) {
    logger.info(`Updating goal ${dbgoal.id}: Changing status from ${dbgoal.status} to ${goal.status}`);
    await Goal.update(
      {
        status: goal.status,
      },
      {
        where: { id: dbgoal.id },
        individualHooks: true,
      },
    );
  } else {
    logger.info(`Skipping goal status update for ${dbgoal.id}: goal status ${dbgoal.status} is newer or equal to ${goal.status}`);
  }
}

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
    for await (const el of recipients) {
      let currentGrants = [];
      let currentGoals = [];
      let currentGoalName = '';
      let currentGoalNum = 0;
      let currentLastEditedDate;

      for await (const key of Object.keys(el)) {
        if (key && (key.trim().startsWith('Grantee (distinct') || key.trim().startsWith('Grantee Name'))) {
          currentGrants = parseGrantNumbers(el[key]);
        } else if (key && key.startsWith('Last Edited (Date)')) {
          currentLastEditedDate = el[key].trim();
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
            if (column !== 'topics') { // ignore topics
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
      // Convert 'Ceased/Suspended' status to 'Suspended'
      // 'Completed' to 'Closed'
      currentGoals = currentGoals.map((goal) => {
        if (goal.status === 'Ceased/Suspended') {
          const modifiedGoal = { ...goal };
          modifiedGoal.status = 'Suspended';
          return modifiedGoal;
        }
        if (goal.status === 'Completed') {
          const modifiedGoal = { ...goal };
          modifiedGoal.status = 'Closed';
          return modifiedGoal;
        }
        return goal;
      });

      for await (const goal of currentGoals) {
        if (goal) { // ignore the dummy element at index 0
          for await (const grant of currentGrants) {
            const fullGrant = { number: grant.trim(), regionId };
            const dbGrant = await Grant.findOne({ where: { ...fullGrant }, attributes: ['id', 'recipientId'] });
            if (!dbGrant) {
              // eslint-disable-next-line no-console
              logger.error(`Couldn't find grant: ${fullGrant.number}. Exiting...`);
              throw new Error('error');
            }
            const grantId = dbGrant.id;
            const dbGoals = await Goal.findAll({
              where: { grantId, name: goal.name },
            });

            if (dbGoals.length > 1) {
              logger.info(`Found multiples of goal id: ${dbGoals[0].id}`);
              logger.info(`Incoming status: ${goal.status}`);
              logger.info(`Incoming last edited date: ${currentLastEditedDate}`);
              logger.info(`Incoming timeframe: ${goal.timeframe}`);
              for await (const dbgoal of dbGoals) {
                // Unable to determine a reliable update; Skipping
                logger.info(`Skipping updates for goal: ${dbgoal.id}`);
                logger.info(`db goal status: ${dbgoal.status}, createdAt: ${dbgoal.createdAt}`);
              }
            } else if (dbGoals.length === 1) {
              const dbGoal = dbGoals[0];
              // update timeframe
              await dbGoal.update(
                {
                  timeframe: goal.timeframe,
                  isRttapa: 'Yes',
                },
                {
                  // where: { id: dbgoal.id },
                  individualHooks: true,
                },
              );
              // determine if status needs to be updated
              await updateStatus(goal, dbGoal);
            } else {
              const newGoal = await Goal.create({
                grantId,
                ...goal,
                isFromSmartsheetTtaPlan: true,
                createdVia: 'imported',
                isRttapa: 'Yes',
              });
              logger.info(`Created goal: ${newGoal.id} with status: ${newGoal.status}`);
            }
          }
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
