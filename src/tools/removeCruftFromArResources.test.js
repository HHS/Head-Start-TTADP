import removeCruftFromArResources from './removeCruftFromArResources';
import db, {
  ActivityReport,
} from '../models';
import { REPORT_STATUSES } from '../constants';

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  topics: ['topics'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: [],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
};

describe('Remove cruft from AR resources', () => {
  let reports = [];
  beforeAll(async () => {
    const reportOne = await ActivityReport.create({ ...sampleReport, ECLKCResourcesUsed: ['{"value":""}'] });
    const reportTwo = await ActivityReport.create({ ...sampleReport, ECLKCResourcesUsed: ['{"value":""}', 'https://gogo.com'] });
    const reportThree = await ActivityReport.create({ ...sampleReport, nonECLKCResourcesUsed: ['{"value":""}'] });
    const reportFour = await ActivityReport.create({ ...sampleReport, nonECLKCResourcesUsed: ['{"value":""}', 'https://gogojuice.com'] });
    const reportFive = await ActivityReport.create({ ...sampleReport, ECLKCResourcesUsed: ['{"value":""}', 'https://gogo.com'], nonECLKCResourcesUsed: ['{"value":""}', 'https://gogojuice.com'] });
    const reportSix = await ActivityReport.create({ ...sampleReport, ECLKCResourcesUsed: ['https://gogo.com'], nonECLKCResourcesUsed: ['https://gogojuice.com'] });
    reports = [reportOne, reportTwo, reportThree, reportFour, reportFive, reportSix];
  });

  afterAll(async () => {
    await Promise.all(reports.map((report) => report.destroy()));
    await db.sequelize.close();
  });

  it('should remove cruft', async () => {
    const reportIds = reports.map((report) => report.id);

    await removeCruftFromArResources(reportIds);

    const reportOne = await ActivityReport.findByPk(reports[0].id);
    expect(reportOne.ECLKCResourcesUsed).toStrictEqual([]);

    const reportTwo = await ActivityReport.findByPk(reports[1].id);
    expect(reportTwo.ECLKCResourcesUsed).toStrictEqual(['https://gogo.com']);

    const reportThree = await ActivityReport.findByPk(reports[2].id);
    expect(reportThree.nonECLKCResourcesUsed).toStrictEqual([]);

    const reportFour = await ActivityReport.findByPk(reports[3].id);
    expect(reportFour.nonECLKCResourcesUsed).toStrictEqual(['https://gogojuice.com']);

    const reportFive = await ActivityReport.findByPk(reports[4].id);
    expect(reportFive.ECLKCResourcesUsed).toStrictEqual(['https://gogo.com']);
    expect(reportFive.nonECLKCResourcesUsed).toStrictEqual(['https://gogojuice.com']);

    const reportSix = await ActivityReport.findByPk(reports[5].id);
    expect(reportSix.ECLKCResourcesUsed).toStrictEqual(['https://gogo.com']);
    expect(reportSix.nonECLKCResourcesUsed).toStrictEqual(['https://gogojuice.com']);
  });
});
