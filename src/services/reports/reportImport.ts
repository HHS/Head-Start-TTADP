import db from '../../models';
import { REPORT_TYPE } from '../../constants';

const {
  ReportImport,
} = db;
const syncReportImports = async (
  entity: {},
) => {};

const includeReportImports = () => ({
  model: ReportImport,
  as: '', // TODO: figure this out
  required: false,
  attributes: [],
});

const getReportImports = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
) => ReportImport.findAll({
  attributes: [],
  where: { reportId: report.id },
});

export {
  syncReportImports,
  getReportImports,
  includeReportImports,
};
