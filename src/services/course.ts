import Sequelize, { Op, WhereOptions } from 'sequelize';
import parse from 'csv-parse/lib/sync';
import db, { sequelize } from '../models';

const {
  Course,
} = db;

interface ICourse {
  id: number;
  name: string;
}

interface DecodedCSV {
  'course name': string;
}

export async function getAllCourses(where: WhereOptions = {}) {
  return Course.findAll({
    where,
    order: [['name', 'ASC']],
    attributes: ['name', 'id'],
  });
}

export async function csvImport(buffer: Buffer | string) {
  const created = [];
  const replaced = [];
  const updated = [];
  const deleted = [];
  const errors = [];
  const skipped = [];

  const importedCourseIds = [];

  const parsed = parse(buffer, { skipEmptyLines: true, columns: true });
  let rowCount = 1;
  let results;
  try {
    results = await Promise.all(parsed.map(async (course: DecodedCSV) => {
      // Trim unexpected chars.
      const trimmedKeys = Object.fromEntries(
        Object.entries(course).map(([key, value]) => [key.trim(), value]),
      );

      // Get the first property value form course object.
      let rawCourseName = trimmedKeys['course name'];

      if (!rawCourseName) {
        // Skip blank course name.
        skipped.push(`Row ${rowCount}: Blank course name`);
        return false;
      }

      // Always trim leading and trailing spaces.
      rawCourseName = rawCourseName.trim();

      // Remove all spaces and special characters from the course name.
      const cleanCourseName = rawCourseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      // Find all existing courses that match the clean course name regardless of case.
      const existingCourses = await Course.findAll({
        where: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('lower', Sequelize.fn('regexp_replace', Sequelize.col('name'), '[^a-zA-Z0-9]', '', 'g')),
              { [Op.like]: cleanCourseName },
            ),
            { deletedAt: null },
          ],
        },
      });

      // If exists.
      if (existingCourses.length) {
        // Check if any of the courses are exact match.
        const exactMatch = existingCourses.find((c: ICourse) => c.name === rawCourseName);

        if (exactMatch) {
          // Update the value for 'updatedAt' on the existing.
          await sequelize.query(`
            UPDATE "Courses"
            SET "updatedAt" = '${new Date().toISOString()}'
            WHERE id = ${exactMatch.id}`);
          updated.push(exactMatch);
          // Add the course name to the importedCourseNames array.
          importedCourseIds.push(...existingCourses.map((c: ICourse) => c.id));
        } else {
          // Create a new course.
          const replacementCourse = await Course.create({
            name: rawCourseName,
          });
          created.push(replacementCourse);

          // Set the 'mapsTo' for the existing courses to the new course id.
          await Course.update({
            mapsTo: replacementCourse.id,
          }, {
            where: {
              id: {
                [Op.in]: existingCourses.map((c: ICourse) => c.id),
              },
              deletedAt: null,
            },
          });

          replaced.push(...existingCourses);

          // Add both the existing and new course names imported.
          importedCourseIds.push(replacementCourse.id);
          importedCourseIds.push(...existingCourses.map((c: ICourse) => c.id));
        }
      } else {
        // Create a new course.
        const newCourse = await Course.create({
          name: rawCourseName,
        });

        created.push(newCourse);

        // Add the course name to the importedCourseNames array.
        importedCourseIds.push(newCourse.id);
      }

      return true;
    }));
    // Delete all courses that were not imported.
    const markedDeleted = await Course.destroy({
      where: {
        id: {
          [Op.notIn]: importedCourseIds,
        },
        deletedAt: null,
      },
      returning: true,
    });

    deleted.push(...markedDeleted);
  } catch (error) {
    errors.push(`Row ${rowCount}: ${error.message}`);
    return false;
  } finally {
    rowCount += 1;
  }

  const count = (await Promise.all(results)).filter(Boolean).length;
  return {
    count,
    updated,
    created,
    replaced,
    deleted,
    skipped,
    errors,
  };
}
