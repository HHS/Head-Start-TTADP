import { Checkbox, Grid } from '@trussworks/react-uswds';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import ControlledDatePicker from '../../../../components/ControlledDatePicker';
import FormItem from '../../../../components/FormItem';
import useHookFormEndDateWithKey from '../../../../hooks/useHookFormEndDateWithKey';
import type { SurveyDateFormValues } from '../types';
import { todayDisplayDate } from '../utils';

interface SurveyDateFieldsProps {
  idPrefix: string;
}

/**
 * Start and end date pickers for a survey window, plus a "Manually close survey" option that
 * disables them. Must be rendered inside a FormProvider with manualClose, startDate, and endDate
 * fields (dates in MM/DD/YYYY format).
 */
export default function SurveyDateFields({ idPrefix }: SurveyDateFieldsProps): React.ReactElement {
  const { control, watch, register, clearErrors } = useFormContext<SurveyDateFormValues>();
  const { manualClose, startDate, endDate } = watch();
  const { endDateKey, setEndDate } = useHookFormEndDateWithKey();
  const today = todayDisplayDate();
  const noteId = `${idPrefix}-manualClose-note`;

  return (
    <>
      <Checkbox
        id={`${idPrefix}-manualClose`}
        name="manualClose"
        label="Manually close survey"
        className="margin-top-3"
        inputRef={register()}
        aria-describedby={manualClose ? noteId : undefined}
        // Errors from the date pickers no longer apply once they're disabled
        onChange={() => clearErrors(['startDate', 'endDate'])}
      />
      {manualClose && (
        <p id={noteId} className="usa-hint margin-top-1 margin-bottom-0">
          The survey will open immediately and stay open until you close it.
        </p>
      )}
      <Grid row gap>
        <Grid tablet={{ col: 6 }} col={12}>
          <FormItem label="Start date" name="startDate" htmlFor={`${idPrefix}-startDate`} required={!manualClose}>
            <div className="usa-hint">mm/dd/yyyy</div>
            <ControlledDatePicker
              control={control}
              name="startDate"
              inputId={`${idPrefix}-startDate`}
              value={startDate}
              minDate={today}
              isStartDate
              setEndDate={setEndDate}
              endDate={endDate}
              disabled={manualClose}
              required={!manualClose}
            />
          </FormItem>
        </Grid>
        <Grid tablet={{ col: 6 }} col={12}>
          <FormItem label="End date" name="endDate" htmlFor={`${idPrefix}-endDate`} required={!manualClose}>
            <div className="usa-hint">mm/dd/yyyy</div>
            <ControlledDatePicker
              key={endDateKey}
              control={control}
              name="endDate"
              inputId={`${idPrefix}-endDate`}
              value={endDate}
              minDate={startDate || today}
              disabled={manualClose}
              required={!manualClose}
            />
          </FormItem>
        </Grid>
      </Grid>
    </>
  );
}
