import { Op } from 'sequelize';
import { expect } from '@playwright/test';
import db, { IpdCourse } from '../models';
import {
  csvImport,
} from './ipdCourse';

describe('ipdCourse', () => {
  beforeAll(async () => {

  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('csvImport', () => {
    const headings = ['course name'];
    const courseNamesToCleanup = [];

    afterEach(async () => {
      await IpdCourse.destroy({
        where: {
          nameLookUp:
          {
            [Op.in]: courseNamesToCleanup,
          },
        },
        force: true,
      });
    });

    it('creates a new course', async () => {
      const newCourseName = 'Sample Course Name to Create';
      courseNamesToCleanup.push(newCourseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());
      const importData = `${headings}
      ${newCourseName}`;

      const buffer = Buffer.from(importData);
      const response = await csvImport(buffer);

      // Check response.
      expect(response.count).toBe(1);
      expect(response.created.length).toBe(1);
      expect(response.updated.length).toBe(0);
      expect(response.replaced.length).toBe(0);
      expect(response.deleted.length).toBe(0);
      expect(response.skipped.length).toBe(0);
      expect(response.errors.length).toBe(0);
      expect(response.created[0].name).toBe(newCourseName);

      // Check database.
      const course = await IpdCourse.findOne({
        where: {
          name: newCourseName,
        },
      });

      expect(course).toBeTruthy();
      expect(course.name).toBe(newCourseName);
      expect(course.nameLookUp).toBe('samplecoursenametocreate');
    });

    it('existing course with exact match', async () => {
      const existingCourse1 = 'Existing course with; exact\' matchz!';
      const existingCourse2 = ' Existing   course With EXACT matchz ';

      const afterCreateDate = new Date();

      // Create the existing courses.
      const course1 = await IpdCourse.create({
        name: existingCourse1,
        nameLookUp: existingCourse1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      const originalUpdatedAt = course1.updatedAt;
      courseNamesToCleanup.push(course1.nameLookUp);

      const course2 = await IpdCourse.create({
        name: existingCourse2,
        nameLookUp: existingCourse2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(course2.nameLookUp);

      // Create data with exact match.
      const importData = `${headings}
        ${existingCourse1}`;

      const buffer = Buffer.from(importData);
      const response = await csvImport(buffer);

      // Check response.
      expect(response.count).toBe(1);
      expect(response.created.length).toBe(0);
      expect(response.updated.length).toBe(1);
      expect(response.replaced.length).toBe(0);
      expect(response.deleted.length).toBe(0);
      expect(response.skipped.length).toBe(0);
      expect(response.errors.length).toBe(0);
      expect(response.updated[0].name).toBe(existingCourse1);

      // Check the database.
      const updateCourse = await IpdCourse.findOne({
        where: {
          id: course1.id,
        },
      });
      expect(updateCourse).toBeTruthy();
      expect(updateCourse.name).toBe(existingCourse1);
      expect(updateCourse.nameLookUp).toBe(existingCourse1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());
      expect(new Date(updateCourse.updatedAt) > afterCreateDate).toBe(true);
    });

    it('existing courses without exact match', async () => {
      const courseToAdd = 'Existing course with exact match';
      courseNamesToCleanup.push(courseToAdd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());

      const existingCourse1 = 'Existing course with; exact\' match!';
      const existingCourse2 = ' Existing   course With EXAC T match ';
      const existingCourse3 = ' Existing     course With EXACT   match ';

      const afterCreateDate = new Date();

      // Create the existing courses.
      const course1 = await IpdCourse.create({
        name: existingCourse1,
        nameLookUp: existingCourse1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(course1.nameLookUp);

      const course2 = await IpdCourse.create({
        name: existingCourse2,
        nameLookUp: existingCourse2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(course2.nameLookUp);

      const course3 = await IpdCourse.create({
        name: existingCourse3,
        nameLookUp: existingCourse3.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(course3.nameLookUp);

      // Create data with exact match.
      const importData = `${headings}
        ${courseToAdd}`;

      const buffer = Buffer.from(importData);
      const response = await csvImport(buffer);

      // Check response.
      expect(response.count).toBe(1);
      expect(response.created.length).toBe(1);
      expect(response.updated.length).toBe(0);
      expect(response.replaced.length).toBe(3);
      expect(response.deleted.length).toBe(0);
      expect(response.skipped.length).toBe(0);
      expect(response.errors.length).toBe(0);
      expect(response.created[0].name).toBe(courseToAdd);

      const updatedCourses = response.replaced.filter((c) => c.name === existingCourse1
        || c.name === existingCourse2
        || c.name === existingCourse3);
      expect(updatedCourses.length).toBe(3);

      // Check the database.
      const addedCourse = await IpdCourse.findOne({
        where: {
          name: courseToAdd,
        },
      });

      expect(addedCourse).toBeTruthy();
      expect(addedCourse.name).toBe(courseToAdd);
      expect(addedCourse.nameLookUp).toBe(courseToAdd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());
      expect(new Date(addedCourse.updatedAt) > afterCreateDate).toBe(true);

      // Get all the updated courses.
      const mapsToCourses = await IpdCourse.findAll({
        where: {
          id: [course1.id, course2.id, course3.id],
        },
      });

      // Assert updated.
      expect(mapsToCourses).toBeTruthy();
      expect(mapsToCourses.length).toBe(3);
      expect(mapsToCourses[0].mapsTo).toBe(addedCourse.id);
      expect(mapsToCourses[1].mapsTo).toBe(addedCourse.id);
      expect(mapsToCourses[2].mapsTo).toBe(addedCourse.id);
    });

    it('deletes unused courses', async () => {
      const courseToAdd = 'Existing course with; exact\' match!';
      courseNamesToCleanup.push(courseToAdd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());

      const courseToDelete1 = 'Course to delete 1';
      const courseToDelete2 = 'Course to delete 2';
      const courseToDelete3 = 'Course to delete 3';

      const afterCreateDate = new Date();

      // Delete 1.
      const courseDeleted1 = await IpdCourse.create({
        name: courseToDelete1,
        nameLookUp: courseToDelete1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(courseDeleted1.nameLookUp);

      // Delete 2.
      const courseDeleted2 = await IpdCourse.create({
        name: courseToDelete2,
        nameLookUp: courseToDelete2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(courseDeleted2.nameLookUp);

      // Delete 3.
      const courseDeleted3 = await IpdCourse.create({
        name: courseToDelete3,
        nameLookUp: courseToDelete3.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim(),
      });
      courseNamesToCleanup.push(courseDeleted3.nameLookUp);

      // Create data with exact match.
      const importData = `${headings}
        ${courseToAdd}`;

      const buffer = Buffer.from(importData);
      const response = await csvImport(buffer);

      // Check response.
      expect(response.count).toBe(1);
      expect(response.created.length).toBe(1);
      expect(response.updated.length).toBe(0);
      expect(response.replaced.length).toBe(0);
      expect(response.deleted.length).toBe(3);
      expect(response.skipped.length).toBe(0);
      expect(response.errors.length).toBe(0);

      // Assert created courses.
      const createdCourse = response.created.filter((c) => c.name === courseToAdd);

      // to be truthy.
      expect(createdCourse.length).toBe(1);

      // Assert deleted courses.
      const deletedCourses = response.deleted.filter((c) => c.name === courseToDelete1
        || c.name === courseToDelete2
        || c.name === courseToDelete3);
      expect(deletedCourses.length).toBe(3);

      // Make sure the deleted courses are not in the database.
      const notFoundInDb = await IpdCourse.findOne({
        where: {
          name: [courseToDelete1, courseToDelete2, courseToDelete3],
          deletedAt: {
            [Op.eq]: null,
          },
        },
      });
      // Assert not found.
      expect(notFoundInDb).toBeFalsy();

      // Check the database.
      const updateCourse = await IpdCourse.findOne({
        where: {
          name: courseToAdd,
        },
      });

      expect(updateCourse).toBeTruthy();
      expect(updateCourse.name).toBe(courseToAdd);
      expect(updateCourse.nameLookUp).toBe(courseToAdd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim());
      expect(new Date(updateCourse.updatedAt) > afterCreateDate).toBe(true);
    });
  });
});
