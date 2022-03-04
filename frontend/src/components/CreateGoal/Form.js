/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import Select from 'react-select';
import {
  Button,
  DatePicker, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';

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

export default function Form({
  saveGoal,
  onSaveDraft,
  setId,
  setReadOnly,
  possibleGrants,
  selectedGrants,
  setSelectedGrants,
  goalName,
  setGoalName,
  recipient,
  regionId,
  endDate,
  setEndDate,
  history,
}) {
  /**
   * button click handlers
   */
  const onSaveAndContinue = async () => {
    try {
      const goal = await saveGoal();
      setId(goal.id);
      setReadOnly(true);
      history.push(`/recipient-tta-records/${recipient.id}/region/${regionId}/goal/${goal.id}`);
    } catch (error) {
      //
      console.log(error);
    }
  };

  const onUpdateText = (e) => setGoalName(e.target.value);

  return (
    <>
      <h2>Recipient TTA goal</h2>
      <h3>Goal summary</h3>
      <FormGroup>
        <Label htmlFor="recipientGrantNumbers">
          Recipient grant numbers
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (Required)</span>
        </Label>
        {possibleGrants.length === 1 ? (
          <p>{selectedGrants[0].label}</p>
        ) : (
          <>
            <span className="usa-hint">Select all grant numbers that apply to the grant</span>
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
            />
          </>
        )}
      </FormGroup>
      <FormGroup>
        <Label htmlFor="goalText">Goal</Label>
        <span className="usa-hint">
          What the recipient wants to achieve
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (Required)</span>
        </span>
        <Textarea id="goalText" name="goalText" required value={goalName} onChange={onUpdateText} />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="goalEnddate">Goal end date</Label>
        <span className="usa-hint">When does the recipient expect to meet this goal? (mm/dd/yyyy)</span>
        <DatePicker
          id="goalEndDate"
          name="goalEndDate"
          onChange={setEndDate}
          defaultValue={endDate}
        />
      </FormGroup>
      <div className="margin-top-4">
        <Link
          to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals-objectives/`}
          className=" usa-button usa-button--outline"
        >
          Cancel
        </Link>
        <Button type="button" outline onClick={onSaveDraft}>Save draft</Button>
        <Button type="button" onClick={onSaveAndContinue}>Save and continue</Button>
      </div>

    </>
  );
}

Form.propTypes = {
  saveGoal: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  setId: PropTypes.func.isRequired,
  setReadOnly: PropTypes.func.isRequired,
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
  recipient: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  setEndDate: PropTypes.func.isRequired,
  history: ReactRouterPropTypes.history.isRequired,
};
