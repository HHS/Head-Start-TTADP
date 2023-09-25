import merge from 'deepmerge';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';

const {
  ReportPageState,
} = db;

const syncReportPageStates = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data,
): Promise<{ promises: Promise<any>, unmatched }> => {
  const promises:Promise<any>[] = [];
  const {
    matched,
    unmatched,
  } = await filterDataToModel(
    {
      ...data,
      reportId: report.id,
    },
    ReportPageState,
  );

  const currentPageState = await ReportPageState.findOne({
    where: { reportId: report.id },
  });

  if (currentPageState) {
    const mergedMatched = {
      ...matched,
      pageState: merge(currentPageState.pageState, matched.pageState),
    };

    const changedData = collectChangedValues(mergedMatched, currentPageState);
    promises.push(ReportPageState.update(
      changedData,
      {
        where: {
          reportId: report.id,
        },
        individualHooks: true,
      },
    ));
  } else {
    promises.push(ReportPageState.create(matched));
  }

  return {
    promises: Promise.all(promises),
    unmatched,
  };
};

const includeReportPageStates = () => ({
  model: ReportPageState,
  as: '', // TODO: fix
  attributes: [
    'id',
    'pageState',
    'updatedAt',
  ],
});

const getReportPageStates = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
) => includeToFindAll(
  includeReportPageStates,
  {
    reportId: report.id,
  },
);

export {
  syncReportPageStates,
  getReportPageStates,
  includeReportPageStates,
};
