import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues } from '../../lib/modelUtils';
import db from '../../models';

const {
  ReportPageState,
} = db;

const mergePageStates = (
  currentValues,
  newValues,
) => {
  if (typeof newValues !== 'object' || typeof currentValues !== 'object') {
    return newValues;
  }

  const merged = { ...currentValues };

  Object.keys(newValues).forEach((key) => {
    if (typeof newValues[key] === 'object' && typeof currentValues[key] === 'object') {
      merged[key] = mergePageStates(newValues[key], currentValues[key]);
    } else {
      merged[key] = newValues[key];
    }
  });

  // Add properties from objectB that are not present in objectA
  Object.keys(currentValues).forEach((key) => {
    if (!(key in newValues)) {
      merged[key] = currentValues[key];
    }
  });

  return merged;
};

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
      pageState: mergePageStates(currentPageState.pageState, matched.pageState),
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

const includeReportPageStates = () => ({});

const getReportPageStates = async () => {};

export {
  syncReportPageStates,
  getReportPageStates,
  includeReportPageStates,
};
