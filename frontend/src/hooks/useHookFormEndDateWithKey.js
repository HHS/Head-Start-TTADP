import { useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

export default function useHookFormEndDateWithKey() {
  const { setValue } = useFormContext();

  // we store this to cause the end date to re-render when updated by the start date (and only then)
  const [endDateKey, setEndDateKey] = useState('endDate');

  const setEndDate = useCallback((newEnd) => {
    setValue('endDate', newEnd);

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  }, [setValue]);

  return {
    endDateKey,
    setEndDateKey,
    setEndDate,
  };
}
