import db from '../../models';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';

const {
  ReportImport,
} = db;
const syncReportImport = async (
  entity: {},
) => {}; // TODO: everything

const includeReportImport = () => ({
  model: ReportImport,
  as: '', // TODO: figure this out
  required: false,
  attributes: [
    'id',
    'data',
  ],
});

const getReportImports = async (
  reportId: number,
) => includeToFindAll(
  includeReportImport,
  {
    reportId,
  },
);

export {
  syncReportImport,
  includeReportImport,
  getReportImports,
};
