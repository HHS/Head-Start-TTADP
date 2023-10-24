import { filterDataToModel } from '../../../lib/modelUtils';
import db from '../../../models';
import { findByName } from '../../enums/generic';
import { syncReport } from '../report';

jest.mock('../../../lib/modelUtils');
jest.mock('../../enums/generic');
jest.mock('../../../models');

describe('syncReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    await db.isReady;
  });

  it('should synchronize an existing report with the given data if the filteredData has an id', async () => {
    const data = {
      id: 123,
      statusId: 456,
      reportType: 'type1',
      status: {
        name: 'status1',
      },
    };
    const filteredData = {
      id: 123,
      statusId: 456,
      reportType: 'type1',
      status: {
        name: 'status1',
      },
    };
    const status = {
      id: 456,
      name: 'status1',
    };
    const report = {
      id: 123,
      statusId: 456,
      reportType: 'type1',
      status: {
        id: 456,
        name: 'status1',
      },
    };

    filterDataToModel.mockResolvedValueOnce({ matched: filteredData, unmatched: {} });
    findByName.mockResolvedValueOnce(status);
    db.Report.findByPk.mockResolvedValueOnce(report);
    db.Report.update.mockResolvedValueOnce(report);

    const result = await syncReport(data);

    expect(filterDataToModel).toHaveBeenCalledWith(data, db.Report);
    expect(findByName).toHaveBeenCalledWith(db.Status, 'status1', 'type1');
    expect(db.Report.findByPk).toHaveBeenCalledWith(123);
    expect(result).toEqual({ report, unmatched: {} });
  });

  it('should create a new report if the filteredData does not have an id', async () => {
    const { Report } = db;
    const data = {
      statusId: 456,
      reportType: 'type1',
      status: {
        name: 'status1',
      },
    };
    const filteredData = {
      statusId: 456,
      reportType: 'type1',
      status: {
        name: 'status1',
      },
    };
    const status = {
      id: 456,
      name: 'status1',
    };
    const report = {
      id: 123,
      statusId: 456,
      reportType: 'type1',
      status: {
        id: 456,
        name: 'status1',
      },
    };

    filterDataToModel.mockResolvedValueOnce({ matched: filteredData, unmatched: {} });
    findByName.mockResolvedValueOnce(status);
    Report.create.mockResolvedValueOnce(report);

    const result = await syncReport(data);

    expect(filterDataToModel).toHaveBeenCalledWith(data, Report);
    expect(findByName).toHaveBeenCalledWith(db.Status, 'status1', 'type1');
    expect(Report.create).toHaveBeenCalledWith(filteredData);
    expect(result).toEqual({ report, unmatched: {} });
  });
});
