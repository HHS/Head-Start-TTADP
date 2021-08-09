import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button } from '@trussworks/react-uswds';
import { SingleDatePicker, isInclusivelyBeforeDay } from 'react-dates';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

import { DATE_FMT, EARLIEST_INC_FILTER_DATE } from '../../../Constants';

function DatePicker({ query, onUpdateFilter, id }) {
  const [isFocused, updateIsFocused] = useState(false);

  let date;
  if (query) {
    date = moment(query, DATE_FMT);
  }

  const onChange = (selectedDate) => {
    if (selectedDate) {
      onUpdateFilter('query', selectedDate.format(DATE_FMT));
    } else {
      onUpdateFilter('query', '');
    }
  };

  return (
    <>
      <SingleDatePicker
        small
        id={id}
        focused={isFocused}
        numberOfMonths={1}
        hideKeyboardShortcutsPanel
        isOutsideRange={(day) => isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE)}
        onFocusChange={({ focused }) => {
          if (!focused) {
            updateIsFocused(focused);
          }
        }}
        onDateChange={(selectedDate) => {
          onChange(selectedDate);
          const input = document.getElementById(id);
          if (input) input.focus();
        }}
        date={date}
      />
      <Button
        onClick={() => { updateIsFocused(true); }}
        aria-label={'open calendar"'}
        type="button"
        unstyled
        className="margin-top-auto margin-bottom-auto font-sans-xs margin-left-1 smart-hub--filter-date-picker-button"
      >
        <FontAwesomeIcon size="1x" color="gray" icon={faCalendar} />
      </Button>
    </>
  );
}

DatePicker.propTypes = {
  query: PropTypes.string,
  onUpdateFilter: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
};

DatePicker.defaultProps = {
  query: null,
};

export default DatePicker;
