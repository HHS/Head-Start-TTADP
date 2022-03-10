/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {
  DatePicker, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import './Form.css';

const selectStyles = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
    return {
      ...provided,
      outline,
      padding: 0,
    };
  },
  control: (provided, state) => {
    const selected = state.getValue();
    return {
      ...provided,
      background: state.isFocused || selected.length ? 'white' : 'transparent',
      border: 'none',
      borderRadius: 0,
      boxShadow: '0',
      // Match uswds disabled style
      opacity: state.isDisabled ? '0.7' : '1',

      overflow: state.isFocused ? 'visible' : 'hidden',
      position: !state.isFocused ? 'absolute' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: state.isFocused && selected.length ? 'auto' : 0,
    };
  },
  indicatorsContainer: (provided) => ({
    ...provided,
    display: 'inline',
    // The arrow dropdown icon is too far to the right, this pushes it back to the left
    marginRight: '4px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({
    ...provided,
    zIndex: 2,
  }),
  multiValue: (provided) => ({ ...provided }),
  multiValueLabel: (provided) => ({ ...provided }),
  valueContainer: (provided) => ({
    ...provided,
    maxHeight: '100%',
  }),
};

export const FORM_FIELD_INDEXES = {
  GRANTS: 0,
  NAME: 1,
  END_DATE: 2,
};

export default function Form({
  possibleGrants,
  selectedGrants,
  setSelectedGrants,
  goalName,
  setGoalName,
  endDate,
  setEndDate,
  errors,
  validateGoalName,
  validateEndDate,
  validateGrantNumbers,
}) {
  const onUpdateText = (e) => setGoalName(e.target.value);

  return (
    <div className="ttahub-create-goals-form">
      <h2>Recipient TTA goal</h2>
      <h3>Goal summary</h3>
      <FormGroup>
        <Label htmlFor="recipientGrantNumbers">
          Recipient grant numbers
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
        </Label>
        {possibleGrants.length === 1 ? (
          <span className="margin-bottom-1">{selectedGrants[0].label}</span>
        ) : (
          <>
            <span className="usa-hint">Select all grant numbers that apply to the grant</span>
            {errors[FORM_FIELD_INDEXES.GRANTS]}
            <Select
              placeholder=""
              inputId="recipientGrantNumbers"
              onChange={setSelectedGrants}
              options={possibleGrants}
              styles={selectStyles}
              components={{
                DropdownIndicator: null,
              }}
              className="usa-select"
              closeMenuOnSelect={false}
              value={selectedGrants}
              isMulti
              onBlur={validateGrantNumbers}
            />
          </>
        )}
      </FormGroup>
      <FormGroup>
        <Label htmlFor="goalText">
          Goal
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
        </Label>
        <span className="usa-hint">
          What the recipient wants to achieve
        </span>
        {errors[FORM_FIELD_INDEXES.NAME]}
        <Textarea onBlur={validateGoalName} id="goalText" name="goalText" required value={goalName} onChange={onUpdateText} />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="goalEndDate">Goal end date</Label>
        <span className="usa-hint">When does the recipient expect to meet this goal? (mm/dd/yyyy)</span>
        {errors[FORM_FIELD_INDEXES.END_DATE]}
        <DatePicker
          id="goalEndDate"
          name="goalEndDate"
          onChange={setEndDate}
          defaultValue={endDate}
          required
          onBlur={validateEndDate}
        />
      </FormGroup>
    </div>
  );
}

Form.propTypes = {
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  validateGoalName: PropTypes.func.isRequired,
  validateEndDate: PropTypes.func.isRequired,
  validateGrantNumbers: PropTypes.func.isRequired,
  possibleGrants: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  selectedGrants: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  setSelectedGrants: PropTypes.func.isRequired,
  goalName: PropTypes.string.isRequired,
  setGoalName: PropTypes.func.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      }),
    ),
  }).isRequired,
  endDate: PropTypes.string,
  setEndDate: PropTypes.func.isRequired,
};

Form.defaultProps = {
  endDate: null,
};
