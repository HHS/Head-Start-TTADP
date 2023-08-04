/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { Op } from 'sequelize';
import { downloadFile } from '../lib/s3';
import {
  // sequelize,
  Course,
} from '../models';
import { logger } from '../logger';

async function parseCsv(fileKey) {
  const { Body: csv } = await downloadFile(fileKey);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

export default async function importCourses(fileKey) {
  const courses = await parseCsv(fileKey);
  let courseRow = 1;
  const created = [];
  const fileCourseNames = [];

  try {
    logger.info(`>>> Starting processing of ${courses.length} Courses`);
    for await (const course of courses) {
      const courseName = course['course name'].trim();
      logger.info(`Processing Course: ${courseName}`);

      let existingCourse = null;
      if (courseName) {
        existingCourse = await Course.findOne({
          where: {
            name: courseName,
          },
        });
      } else {
        logger.info(`Course name missing: The course on row ${courseRow} is missing a title. Skipping...`);
        // eslint-disable-next-line no-continue
        continue;
      }

      // Add to imported courses.
      fileCourseNames.push(courseName);

      created.push(await Course.create({
        name: courseName,
      }));

      // Increase row count.
      courseRow += 1;
    }
    logger.info(`<<< Success! Finished processing of ${created.length} new Courses`);

    logger.info('>>> Starting marking inactive Courses');

    // Set the 'inactiveDate' for any courses that were not imported.
    const inactive = await Course.update(
      { inactiveDate: new Date() },
      {
        where: {
          name: {
            [Op.notIn]: fileCourseNames,
          },
        },
      },
    );
    console.log('\n\n\n-----Inactive : ', inactive);
    logger.info(`<<< Success! Finished marking ${inactive.length} inactive Courses`);
    return { created, inactive };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return created.length;
  }
}
