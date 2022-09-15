import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Label,
  ModalToggleButton,
  Modal,
  ModalHeading,
  ModalFooter,
  ButtonGroup,
  Button,
} from '@trussworks/react-uswds';
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
        ref={modalRef}
        aria-labelledby="modal-heading"
        aria-describedby="modal-description"
        data-testid="remove-objective-modal"
        className="ttahub-objective-select-remove-objective-modal"
      >
        <ModalHeading id="modal-heading">
          Are you sure you want to remove this objective?
        </ModalHeading>
        <div className="usa-prose">
          Any information you entered will be lost.
        </div>
        <ModalFooter>
          <ButtonGroup>
            <ModalToggleButton
              data-focus="true"
              modalRef={modalRef}
              closer
              unstyled
              className="padding-105"
            >
              Cancel
            </ModalToggleButton>
            <Button data-testid="objective-confirm-remove-button" onClick={onRemove}>
              Remove
            </Button>
          </ButtonGroup>
        </ModalFooter>
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
