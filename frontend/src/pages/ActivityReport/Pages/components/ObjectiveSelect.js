import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Label, ModalToggleButton } from '@trussworks/react-uswds';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { OBJECTIVE_PROP } from './constants';
import Option from './ObjectiveOption';
import SingleValue from './ObjectiveValue';
import './ObjectiveSelect.css';
import Modal from '../../../../components/Modal';

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
  const modalRef = useRef(null);

  return (
    <>
      <div className="display-flex flex-justify maxw-mobile-lg margin-top-5">
        <h3 className="margin-0">Objective summary</h3>
        { onRemove && (
          <ModalToggleButton
            modalRef={modalRef}
            type="button"
            className="ttahub-objective-select-remove-objective"
            unstyled
            onClick={onRemove}
          >
            Remove this objective
          </ModalToggleButton>
        )}
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

      <Modal
        modalRef={modalRef}
        title="Are you sure you want to remove this objective?"
        modalId="remove-objective-modal"
        onOk={onRemove}
        okButtonText="Remove"
        okButtonAriaLabel="This button will remove the objective from the activity report"
      >
        <p>Any information you entered will be lost.</p>
      </Modal>
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
