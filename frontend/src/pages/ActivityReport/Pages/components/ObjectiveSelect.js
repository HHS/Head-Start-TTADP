import React from 'react';
import PropTypes from 'prop-types';
import { Button, Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { OBJECTIVE_PROP } from './constants';
import Option from './ObjectiveOption';
import SingleValue from './ObjectiveValue';
import './ObjectiveSelect.css';

const components = {
  Option,
  SingleValue,
};

export default function ObjectiveSelect({
  onChange,
  selectedObjectives,
  options,
  onRemove,
  noObjectiveError,
}) {
  return (
    <>
      <div className="display-flex flex-justify maxw-mobile-lg margin-top-5">
        <h3 className="margin-0">Objective summary</h3>
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
          className="usa-select margin-bottom-3"
          options={options}
          styles={selectOptionsReset}
          placeholder="- Select -"
          value={selectedObjectives}
          components={components}
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
