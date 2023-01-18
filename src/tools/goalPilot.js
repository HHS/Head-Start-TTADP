/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { downloadFile } from '../lib/s3';
import {
  Goal,
  Grant,
  GoalTemplate,
} from '../models';
import { logger } from '../logger';

async function parseCsv(fileKey) {
  let recipients = {};
  const { Body: csv } = await downloadFile(fileKey);
  [...recipients] = parse(csv, {
    skipEmptyLines: true,
    columns: true,
    from_line: 2,
  });
  return recipients;
}

/**
 * Processes data from .csv extracting recipients grant numbers
 * which are then used to find grant ids.
 * A template for the common goal is created followed by goal creation for all of the recipients.
 */
export default async function createGoal(fileKey) {
  const recipients = await parseCsv(fileKey);
  const goalName = '(PILOT) Grant recipient will improve teacher-child interactions (as measured by CLASS scores)';

  const goal = {
    name: goalName,
    status: 'Not Started',
    isRttapa: 'No',
    onApprovedAR: false,
    isFromSmartsheetTtaPlan: false,
    createdVia: 'rtr',
  };

  try {
    const [dbGoalTemplate] = await GoalTemplate.findOrCreate({
      where: { templateName: goalName },
      defaults: { templateName: goalName },
    });

    for await (const el of recipients) {
      let number = '';

      number = el['Grant Number'];

      const grant = await Grant.findOne(
        {
          where: { number },
          attributes: ['id'],
        },
      );
      await Goal.findOrCreate({
        where: { name: goalName, grantId: grant.id },
        defaults: { ...goal, grantId: grant.id, goalTemplateId: dbGoalTemplate.id },
      });
    }
  } catch (err) {
    logger.error(err);
    return 0;
  }
  return recipients.length;
}
