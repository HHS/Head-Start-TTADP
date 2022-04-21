import React from 'react';
import PropTypes from 'prop-types';
import { Button, Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { OBJECTIVE_PROP } from './constants';
import './ObjectiveSelect.css';

export default function ObjectiveSelect({
  onChange,
  selectedObjectives,
  options,
  onRemove,
  noObjectiveError,
}) {
  let selection = selectedObjectives;

  if (selectedObjectives.id) {
    const { id, ...fields } = selectedObjectives;
    selection = fields;
  }

  return (
    <>
      <div className="display-flex flex-justify maxw-mobile-lg margin-top-4">
        <h3>Objective summary</h3>
        { onRemove
          && (<Button type="button" className="ttahub-objective-select-remove-objective" unstyled onClick={onRemove}>Remove this objective</Button>)}
      </div>
      <Label>
        Select TTA objective
        <Req />
        {noObjectiveError}
        <Select
          name="objectives"
          onChange={onChange}
          className="usa-select"
          options={options}
          styles={selectOptionsReset}
          placeholder="- Select -"
          value={selection}
        />
      </Label>
    </>
  );
}

ObjectiveSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  selectedObjectives: PropTypes.oneOfType([
    PropTypes.arrayOf(OBJECTIVE_PROP),
    OBJECTIVE_PROP,
  ]).isRequired,
  options: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  onRemove: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  noObjectiveError: PropTypes.node,
};

ObjectiveSelect.defaultProps = {
  onRemove: false,
  noObjectiveError: <></>,
};
