import { Op } from 'sequelize'
import db, { Course } from '../models'
import { csvImport, getAllCourses } from './course'

describe('Course', () => {
  let foreverCourse

  afterAll(async () => {
    await foreverCourse.destroy()
    await db.sequelize.close()
  })

  describe('csvImport', () => {
    beforeAll(async () => {
      // delete all courses that are not persisted on upload.
      await Course.destroy({
        where: {
          persistsOnUpload: false,
        },
        force: true,
      })

      foreverCourse = await Course.create({
        name: 'Forever course',
        persistsOnUpload: true,
      })
    })

    const headings = ['course name']
    const courseNamesToCleanup = []

    afterEach(async () => {
      await Course.destroy({
        where: {
          name: {
            [Op.in]: courseNamesToCleanup,
          },
        },
        force: true,
      })
    })

    const verifyPersistedCourse = async (courseName) => {
      const course = await Course.findOne({
        where: {
          name: courseName,
        },
      })

      expect(course).toBeTruthy()
      expect(course.name).toBe(courseName)
      expect(course.persistsOnUpload).toBe(true)
    }

    it('creates a new course', async () => {
      // get all courses.
      const coursesBefore = await getAllCourses()

      const newCourseName = 'Sample Course Name to Create'
      courseNamesToCleanup.push(newCourseName)
      const importData = `${headings}
      ${newCourseName}`

      const buffer = Buffer.from(importData)
      const response = await csvImport(buffer)

      // Check response.
      expect(response.count).toBe(1)
      expect(response.created.length).toBe(1)
      expect(response.updated.length).toBe(0)
      expect(response.replaced.length).toBe(0)
      expect(response.deleted.length).toBe(0)
      expect(response.skipped.length).toBe(0)
      expect(response.errors.length).toBe(0)
      expect(response.created[0].name).toBe(newCourseName)

      // Check database.
      const course = await Course.findOne({
        where: {
          name: newCourseName,
        },
      })

      expect(course).toBeTruthy()
      expect(course.name).toBe(newCourseName)

      // test our find all
      const courses = await getAllCourses({ persistsOnUpload: false })
      expect(courses.length).toBe(1)
      expect(courses[0].name).toBe(newCourseName)

      // ensure the forever course is still there and not modified or deleted.
      verifyPersistedCourse('Forever course')
    })

    it('existing course with exact match', async () => {
      const existingCourse1 = "Existing course with; exact' matchz!"
      const existingCourse2 = ' Existing   course With EXACT matchz '

      const afterCreateDate = new Date()

      // Create the existing courses.
      const course1 = await Course.create({
        name: existingCourse1,
      })

      courseNamesToCleanup.push(course1.name)

      const course2 = await Course.create({
        name: existingCourse2,
      })
      courseNamesToCleanup.push(course2.name)

      // Create data with exact match.
      const importData = `${headings}
        ${existingCourse1}`

      const buffer = Buffer.from(importData)
      const response = await csvImport(buffer)

      // Check response.
      expect(response.count).toBe(1)
      expect(response.created.length).toBe(0)
      expect(response.updated.length).toBe(1)
      expect(response.replaced.length).toBe(0)
      expect(response.deleted.length).toBe(0)
      expect(response.skipped.length).toBe(0)
      expect(response.errors.length).toBe(0)
      expect(response.updated[0].name).toBe(existingCourse1)

      // Check the database.
      const updateCourse = await Course.findOne({
        where: {
          id: course1.id,
        },
      })
      expect(updateCourse).toBeTruthy()
      expect(updateCourse.name).toBe(existingCourse1)
      expect(new Date(updateCourse.updatedAt) > afterCreateDate).toBe(true)

      // ensure the forever course is still there and not modified or deleted.
      verifyPersistedCourse('Forever course')
    })

    it('existing courses without exact match', async () => {
      const courseToAdd = 'Existing course with exact match'
      courseNamesToCleanup.push(courseToAdd)

      const existingCourse1 = "Existing course with; exact' match!"
      const existingCourse2 = ' Existing   course With EXAC T match '
      const existingCourse3 = ' Existing     course With EXACT   match '

      const afterCreateDate = new Date()

      // Create the existing courses.
      const course1 = await Course.create({
        name: existingCourse1,
      })
      courseNamesToCleanup.push(course1.name)

      const course2 = await Course.create({
        name: existingCourse2,
      })
      courseNamesToCleanup.push(course2.name)

      const course3 = await Course.create({
        name: existingCourse3,
      })
      courseNamesToCleanup.push(course3.name)

      // Create data with exact match.
      const importData = `${headings}
        ${courseToAdd}`

      const buffer = Buffer.from(importData)
      const response = await csvImport(buffer)

      // Check response.
      expect(response.count).toBe(1)
      expect(response.created.length).toBe(1)
      expect(response.updated.length).toBe(0)
      expect(response.replaced.length).toBe(3)
      expect(response.deleted.length).toBe(0)
      expect(response.skipped.length).toBe(0)
      expect(response.errors.length).toBe(0)
      expect(response.created[0].name).toBe(courseToAdd)

      const updatedCourses = response.replaced.filter((c) => c.name === existingCourse1 || c.name === existingCourse2 || c.name === existingCourse3)
      expect(updatedCourses.length).toBe(3)

      // Check the database.
      const addedCourse = await Course.findOne({
        where: {
          name: courseToAdd,
        },
      })

      expect(addedCourse).toBeTruthy()
      expect(addedCourse.name).toBe(courseToAdd)
      expect(new Date(addedCourse.updatedAt) > afterCreateDate).toBe(true)

      // Get all the updated courses.
      const mapsToCourses = await Course.findAll({
        where: {
          id: [course1.id, course2.id, course3.id],
        },
      })

      // Assert updated.
      expect(mapsToCourses).toBeTruthy()
      expect(mapsToCourses.length).toBe(3)
      expect(mapsToCourses[0].mapsTo).toBe(addedCourse.id)
      expect(mapsToCourses[1].mapsTo).toBe(addedCourse.id)
      expect(mapsToCourses[2].mapsTo).toBe(addedCourse.id)

      // ensure the forever course is still there and not modified or deleted.
      verifyPersistedCourse('Forever course')
    })

    it('deletes unused courses', async () => {
      const courseToAdd = "Existing course with; exact' match!"
      courseNamesToCleanup.push(courseToAdd)

      const courseToDelete1 = 'Course to delete 1'
      const courseToDelete2 = 'Course to delete 2'
      const courseToDelete3 = 'Course to delete 3'

      const afterCreateDate = new Date()

      // Delete 1.
      const courseDeleted1 = await Course.create({
        name: courseToDelete1,
      })
      courseNamesToCleanup.push(courseDeleted1.name)

      // Delete 2.
      const courseDeleted2 = await Course.create({
        name: courseToDelete2,
      })
      courseNamesToCleanup.push(courseDeleted2.name)

      // Delete 3.
      const courseDeleted3 = await Course.create({
        name: courseToDelete3,
      })
      courseNamesToCleanup.push(courseDeleted3.name)

      // Create data with exact match.
      const importData = `${headings}
        ${courseToAdd}`

      const buffer = Buffer.from(importData)
      const response = await csvImport(buffer)

      // Check response.
      expect(response.count).toBe(1)
      expect(response.created.length).toBe(1)
      expect(response.updated.length).toBe(0)
      expect(response.replaced.length).toBe(0)
      expect(response.deleted.length).toBe(3)
      expect(response.skipped.length).toBe(0)
      expect(response.errors.length).toBe(0)

      // Assert created courses.
      const createdCourse = response.created.filter((c) => c.name === courseToAdd)

      // to be truthy.
      expect(createdCourse.length).toBe(1)

      // Assert deleted courses.
      const deletedCourses = response.deleted.filter((c) => c.name === courseToDelete1 || c.name === courseToDelete2 || c.name === courseToDelete3)
      expect(deletedCourses.length).toBe(3)

      // Make sure the deleted courses are not in the database.
      const notFoundInDb = await Course.findOne({
        where: {
          name: [courseToDelete1, courseToDelete2, courseToDelete3],
          deletedAt: {
            [Op.eq]: null,
          },
        },
      })
      // Assert not found.
      expect(notFoundInDb).toBeFalsy()

      // Check the database.
      const updateCourse = await Course.findOne({
        where: {
          name: courseToAdd,
        },
      })

      expect(updateCourse).toBeTruthy()
      expect(updateCourse.name).toBe(courseToAdd)
      expect(new Date(updateCourse.updatedAt) > afterCreateDate).toBe(true)

      // find foreverCourse

      const foreverCourseFromDb = await Course.findOne({
        where: {
          name: 'Forever course',
        },
      })

      expect(foreverCourseFromDb).toBeTruthy()

      // confirm deletedAt is null
      expect(foreverCourseFromDb.deletedAt).toBeNull()

      // ensure the forever course is still there and not modified or deleted.
      verifyPersistedCourse('Forever course')
    })
  })
})
