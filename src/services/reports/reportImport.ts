import db from '../../models';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';

const {
  ReportImport,
} = db;
const syncReportImports = async (
  entity: {},
) => {}; // TODO: everything

const includeReportImports = () => ({
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
  includeReportImports,
  {
    reportId,
  },
);

export {
  syncReportImports,
  getReportImports,
  includeReportImports,
};
