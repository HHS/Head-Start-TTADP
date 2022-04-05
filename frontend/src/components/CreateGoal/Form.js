/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {
  DatePicker, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import ObjectiveForm from './ObjectiveForm';
import './Form.css';
import PlusButton from './PlusButton';
import QuestionTooltip from './QuestionTooltip';
import {
  OBJECTIVE_DEFAULTS,
  OBJECTIVE_DEFAULT_ERRORS,
  FORM_FIELD_INDEXES,
  SELECT_STYLES,
} from './constants';

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
  objectives,
  setObjectives,
  setObjectiveError,
  topicOptions,
  isOnApprovedReport,
  status,
}) {
  const onUpdateText = (e) => setGoalName(e.target.value);

  const onAddNewObjectiveClick = () => {
    // copy existing state, add a blank
    const obj = [...objectives.map((o) => ({ ...o })), OBJECTIVE_DEFAULTS(objectives.length)];

    // save
    setObjectives(obj);
    setObjectiveError(obj.length - 1, OBJECTIVE_DEFAULT_ERRORS);
  };

  const removeObjective = (index) => {
    // copy existing state
    const obj = objectives.map((o) => ({ ...o }));
    obj.splice(index, 1);

    // save
    setObjectives(obj);
  };

  const setObjective = (data, index) => {
    const obj = objectives.map((o) => ({ ...o }));
    obj.splice(index, 1, data);
    setObjectives(obj);
  };

  const objectiveErrors = errors[FORM_FIELD_INDEXES.OBJECTIVES];

  return (
    <div className="ttahub-create-goals-form">
      <h2>Recipient TTA goal</h2>
      <div>
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        {' '}
        indicates required field
      </div>

      <h3>Goal summary</h3>
      <FormGroup error={errors[FORM_FIELD_INDEXES.GRANTS].props.children}>
        <Label htmlFor="recipientGrantNumbers">
          Recipient grant numbers
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        </Label>
        {selectedGrants.length === 1 || isOnApprovedReport ? (
          <span className="margin-bottom-1">{selectedGrants.map((grant) => grant.label).join(', ')}</span>
        ) : (
          <>
            {errors[FORM_FIELD_INDEXES.GRANTS]}
            <Select
              placeholder=""
              inputId="recipientGrantNumbers"
              onChange={setSelectedGrants}
              options={possibleGrants}
              styles={SELECT_STYLES}
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
      <FormGroup error={errors[FORM_FIELD_INDEXES.NAME].props.children}>
        <Label htmlFor="goalText">
          Recipient&apos;s goal
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        </Label>
        { isOnApprovedReport ? (
          <p className="margin-top-0">{goalName}</p>
        ) : (
          <>
            {errors[FORM_FIELD_INDEXES.NAME]}
            <Textarea onBlur={validateGoalName} id="goalText" name="goalText" required value={goalName} onChange={onUpdateText} />
          </>
        )}
      </FormGroup>
      <FormGroup error={errors[FORM_FIELD_INDEXES.END_DATE].props.children}>
        <Label htmlFor="goalEndDate">
          Estimated close date (mm/dd/yyyy)
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
          <QuestionTooltip text="When do you expect to end TTA work and mark this goal as closed?" />
        </Label>

        { isOnApprovedReport ? (
          <span>{endDate}</span>
        ) : (
          <>
            {errors[FORM_FIELD_INDEXES.END_DATE]}
            <DatePicker
              id="goalEndDate"
              name="goalEndDate"
              onChange={setEndDate}
              defaultValue={endDate}
              required
              onBlur={validateEndDate}
            />
          </>
        )}
      </FormGroup>
      { objectives.map((objective, i) => (
        <ObjectiveForm
          index={i}
          objective={objective}
          removeObjective={removeObjective}
          setObjectiveError={setObjectiveError}
          key={objective.id}
          errors={objectiveErrors[i]}
          setObjective={(data) => setObjective(data, i)}
          topicOptions={topicOptions}
          goalStatus={status}
        />
      ))}

      <div className="margin-top-6">
        <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
      </div>

    </div>
  );
}

Form.propTypes = {
  isOnApprovedReport: PropTypes.bool.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  validateGoalName: PropTypes.func.isRequired,
  validateEndDate: PropTypes.func.isRequired,
  validateGrantNumbers: PropTypes.func.isRequired,
  setObjectiveError: PropTypes.func.isRequired,
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
  setObjectives: PropTypes.func.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  objectives: PropTypes.arrayOf(PropTypes.shape({
    objective: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    })),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })).isRequired,
  status: PropTypes.string.isRequired,
};

Form.defaultProps = {
  endDate: null,
};
