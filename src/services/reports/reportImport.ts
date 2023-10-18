import db from '../../models';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';

const {
  ReportImport,
} = db;
const syncReportImport = async (
  entity: {},
) => {}; // TODO: everything

const includeReportImport = () => ({
  model: ReportImport,
  as: 'reportImports',
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
