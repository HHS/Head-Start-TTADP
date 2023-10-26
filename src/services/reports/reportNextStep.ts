// TODO: everything
import db from '../../models';
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
  const [
    currentNextSteps,
    ...filteredData
  ] = await Promise.all([
    ReportNextStep.findAll({
      where: {
        reportId: report.id,
        noteType,
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
    filteredData
      .filter((ns) => !(currentNextSteps.filter((cns) => (
        (ns.id && ns.id === cns.id)
        || (ns.note && ns.note === cns.note)
      )).length > 0)),
    filteredData
      .filter((ns) => (currentNextSteps.filter((cns) => (
        (ns.id && ns.id === cns.id)
        || (ns.note && ns.note === cns.note)
      )).length > 0))
      .map((ns) => {
        const currentNS = currentNextSteps.find((cns) => (
          (ns.id && ns.id === cns.id)
          || (ns.note && ns.note === cns.note)
        ));
        return collectChangedValues(ns, currentNS);
      })
      .filter((ns) => Object.keys(ns).length > 1),
    currentNextSteps
      .filter((cns) => !filteredData.includes((fd) => fd?.id === cns.id))
      .map((cns) => cns.id),
  ];

  return {
    promises: [
      ...(createList?.length
        ? ReportNextStep.bulkCreate(
          createList,
          {
            individualHooks: true,
          },
        )
        : [Promise.resolve()]),
      ...(updateList?.length
        ? updateList.map(async (ul) => ReportNextStep.update(
          ul,
          {
            where: { id: ul.id },
            individualHooks: true,
          },
        ))
        : [Promise.resolve()]),
      (destroyList?.length
        ? ReportNextStep.destroy({
          where: { id: destroyList },
          individualHooks: true,
        })
        : Promise.resolve()),
    ],
    unmatched: filteredData.map(({ unmatched }) => unmatched),
  };
};

const includeReportNextSteps = (
  noteType: typeof NEXTSTEP_NOTETYPE[keyof typeof NEXTSTEP_NOTETYPE],
) => ({
  model: ReportNextStep,
  as: `reportNextStepAS${noteType[0] + noteType.slice(1).toLowerCase()}`,
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
  include: [
    // TODO: need to fetch resources
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
