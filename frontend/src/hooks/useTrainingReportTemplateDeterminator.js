import { useRef } from 'react';

/**
 * Determine whether to show the POC complete view or the form.
 * @param {shape} formData
 * @param {number} isPoc
 */
export default function useTrainingReportTemplateDeterminator(formData, isPoc) {
  // eslint-disable-next-line max-len
  const ref = useRef(isPoc && formData.pocComplete && formData.pocCompleteId && formData.pocCompleteDate);
  return ref.current;
}
