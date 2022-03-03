/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import Select from 'react-select';
import {
  Button,
  DatePicker, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import Container from '../../components/Container';

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

export default function CreateGoal() {
  const [readOnly, setReadOnly] = useState(false);

  // save goal to backend
  const saveGoal = async () => {};

  // on form submit
  const onSubmit = (e) => e.preventDefault();

  /**
   * button click handlers
   */
  const onCancel = () => {};
  const onSaveAndContinue = () => {

  };
  const onSaveDraft = () => {

  };

  return (
    <>
      <h1 className="ttahub-recipient-record--heading margin-top-0 margin-bottom-1 margin-left-2">
        TTA Goals Recipient Name - Region #
      </h1>
      <Container className="margin-bottom-2">

        <form className={readOnly ? 'review' : ''} onSubmit={onSubmit}>
          <h2>Recipient TTA goal</h2>
          <h3>Goal summary</h3>
          <FormGroup>
            <Label htmlFor="recipientGrantNumbers">
              Recipient grant numbers
              <span className="smart-hub--form-required font-family-sans font-ui-xs"> (Required)</span>
            </Label>
            <span className="usa-hint">Select all grant numbers that apply to the grant</span>
            <Select
              placeholder=""
              inputId="recipientGrantNumbers"
              onChange={() => {}}
              options={[{
                label: 'no',
                value: 0,
              }]}
              styles={selectStyles}
              components={{
                DropdownIndicator: null,
              }}
              className="usa-select"
              closeMenuOnSelect={false}
              value={null}
              isMulti
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="goalText">Goal</Label>
            <span className="usa-hint">
              What the recipient wants to achieve
              <span className="smart-hub--form-required font-family-sans font-ui-xs"> (Required)</span>
            </span>
            <Textarea id="goalText" name="goalText" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="goalEnddate">Goal end date</Label>
            <span className="usa-hint">When does the recipient expect to meet this goal? (mm/dd/yyyy)</span>
            <DatePicker
              id="goalEndDate"
              name="goalEndDate"
            />
          </FormGroup>
          <div className="margin-top-4">
            <Button outline>Cancel</Button>
            <Button outline>Save draft</Button>
            <Button>Save and continue</Button>
          </div>
        </form>
      </Container>
    </>
  );
}
