import { useMemo } from 'react';

/**
 * Determine whether to show the POC complete view or the form.
 * @param {shape} formData
 * @param {number} isPoc
 */
export default function useTrainingReportTemplateDeterminator(formData, isPoc) {
  // eslint-disable-next-line max-len
  return useMemo(() => isPoc && formData.pocComplete && formData.pocCompleteId && formData.pocCompleteDate, [formData.pocComplete, formData.pocCompleteDate, formData.pocCompleteId, isPoc]);
}
