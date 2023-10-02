// TODO: everything
import db from '../../models';
import { includeReportNextStepResources } from './reportNextStepResource';
import { REPORT_TYPE, COLLABORATOR_TYPES, NEXTSTEP_NOTETYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';

const {
  ReportNextStep,
} = db;

const syncReportNextSteps = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  noteType: typeof NEXTSTEP_NOTETYPE[keyof typeof NEXTSTEP_NOTETYPE],
  data,
) => {
  const promises:Promise<any>[] = [];

  const [
    currentNextSteps,
    ...filteredData
  ] = await Promise.all([
    ReportNextStep.findAll({
      where: {
        reportId: report.id,
      },
      raw: true,
    }),
    ...data.map(async (datum) => filterDataToModel(
      {
        ...datum,
        reportId: report.id,
      },
      ReportNextStep,
    )),
  ]);

  const [
    createList,
    updateList,
    destroyList,
  ] = [
    data
      .filter((ns) => !(currentNextSteps.filter((cns) => (
        (ns.id && ns.id === cns.id)
        || (ns.note && ns.note === cns.note)
      )).length > 0)),
    data
      .filter((ns) => (currentNextSteps.filter((cns) => (
        (ns.id && ns.id === cns.id)
        || (ns.note && ns.note === cns.note)
      )).length > 0))
      .map((ns) => {

      }),
  ];

  return {
    unmatched: filteredData.map(({ unmatched }) => unmatched),
  };
};

const includeReportNextSteps = (
  noteType: typeof NEXTSTEP_NOTETYPE[keyof typeof NEXTSTEP_NOTETYPE],
) => ({
  model: ReportNextStep,
  as: '',
  required: false,
  where: {
    noteType,
  },
  attributes: [
    'id',
    'note',
    'noteType',
    'completedDate',
  ],
  includes: [
    includeReportNextStepResources(),
  ],
});

const getReportNextSteps = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  noteType: typeof NEXTSTEP_NOTETYPE[keyof typeof NEXTSTEP_NOTETYPE],
) => includeToFindAll(
  includeReportNextSteps,
  {
    reportId: report.id,
  },
  [noteType],
);

export {
  syncReportNextSteps,
  includeReportNextSteps,
  getReportNextSteps,
};
