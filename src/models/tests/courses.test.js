import faker from '@faker-js/faker';
import db, { Course } from '..';

describe('Course', () => {
  let course;
  beforeAll(async () => {
    // Create Course.
    course = await Course.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: 'My sample course name',
    });
  });
  afterAll(async () => {
    // Delete Course.
    await Course.destroy({
      where: {
        id: course.id,
      },
    });
    await db.sequelize.close();
  });

  it('course', async () => {
    // Get Course.
    let courseToCheck = await Course.findOne({
      where: {
        id: course.id,
      },
    });

    // Assert values.
    expect(courseToCheck).toHaveProperty('id');
    expect(courseToCheck.name).toEqual('My sample course name');
    expect(courseToCheck.inactiveDate).toBe(null);

    // Update Course.
    courseToCheck = await courseToCheck.update({
      name: 'My updated course name',
      inactiveDate: '2023-08-04',
    });

    // Assert Course values.
    courseToCheck = await Course.findOne({
      where: {
        id: course.id,
      },
    });

    expect(courseToCheck).toHaveProperty('id');
    expect(courseToCheck.name).toEqual('My updated course name');
    expect(courseToCheck.inactiveDate).toEqual(new Date('2023-08-04T00:00:00.000Z'));
  });
});
