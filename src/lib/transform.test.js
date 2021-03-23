import { ActivityReport, User, sequelize } from '../models';
import activityReportToCsvRecord from './transform';

describe('activityReportToCsvRecord', () => {
  const mockAuthor = {
    id: 2099,
    name: 'Arthur',
    hsesUserId: '2099',
    hsesUsername: 'arthur.author',
  };

  const mockReport = {
    id: 209914,
    regionId: 14,
    reason: 'Test CSV Export',
    status: 'approved',
    numberOfParticipants: 12,
    deliveryMethod: 'virtual',
    duration: 4.5,
    startDate: '2021-10-31',
    endSDate: '2021-11-31',
    ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
    nonECLKCResourcesUsed: ['one', 'two'],
    author: mockAuthor,
    lastUpdatedBy: mockAuthor,
  };

  it('transforms arrays of strings into strings', async () => {
    const report = ActivityReport.build({
      ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
      nonECLKCResourcesUsed: ['one', 'two'],
    });
    const output = await activityReportToCsvRecord(report);
    const expectedOutput = {
      ECLKCResourcesUsed: 'https://one.test\nhttps://two.test',
      nonECLKCResourcesUsed: 'one\ntwo',
    };
    expect(output).toMatchObject(expectedOutput);
  });

  it('transforms related models into string values', async () => {
    const report = await ActivityReport.build(mockReport, { include: [{ model: User, as: 'author' }, { model: User, as: 'lastUpdatedBy' }] });
    const output = await activityReportToCsvRecord(report);
    const { author: authorOutput, lastUpdatedBy: lastUpdatedByOutput } = output;
    expect(authorOutput).toEqual('Arthur');
    expect(lastUpdatedByOutput).toEqual('Arthur');
  });
});
