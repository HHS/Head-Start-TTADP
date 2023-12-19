import { after } from 'cheerio/lib/api/manipulation';
import db, {
  IpdCourse,
  Objective,
  ActivityReport,
  ActivityReportObjective,
} from '..';

describe('Goals', () => {
  let ipdCourse;
  // let activityReport;
  // let objective;
  // let activityReportObjective;
  // let ObjectiveIpdCourses;
  // let ActivityReportObjectiveIpdCourse;

  beforeAll(async () => {
    // Create IpdCourse.
    ipdCourse = await IpdCourse.create({
      name: 'Test IpdCourse',
    });
  });

  afterAll(async () => {
    // Delete IpdCourse.
    await IpdCourse.destroy({
      where: {
        id: ipdCourse.id,
      },
      force: true,
    });
    await db.sequelize.close();
  });

  it('Update IpdCourse', async () => {
    const newIpdCourseName = 'Test IpdCourse Updated';
    ipdCourse.name = newIpdCourseName;
    await IpdCourse.update({
      name: newIpdCourseName,
    }, {
      where: {
        id: ipdCourse.id,
      },
    });
    ipdCourse = await IpdCourse.findByPk(ipdCourse.id);
    expect(ipdCourse.name).toBe(newIpdCourseName);
  });
});
