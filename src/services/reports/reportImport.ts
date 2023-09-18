import db from '../../models';
import { REPORT_TYPE } from '../../constants';

const {
  ReportImport,
} = db;
const syncReportImports = async (
  entity: {},
) => {};

const includeReportImports = () => ({});

const getReportImports = async (
  report: { id: number, type: }
) => ReportImport.findAll({
  attributes: [],
  where: {}
});

export {
  syncReportImports,
  getReportImports,
  includeReportImports,
};
