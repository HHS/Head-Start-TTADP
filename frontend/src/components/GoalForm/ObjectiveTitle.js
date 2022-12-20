import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';
import Req from '../Req';

export default function ObjectiveTitle({
  error,
  isOnApprovedReport,
  isOnReport,
  title,
  onChangeTitle,
  validateObjectiveTitle,
  status,
  inputName,
  isLoading,
  userCanEdit,
}) {
  const readOnly = useMemo(() => (
    isOnApprovedReport
    || status === 'Complete'
    || status === 'Suspended'
    || (status === 'Not Started' && isOnReport)
    || (status === 'In Progress' && isOnReport)
    || !userCanEdit),
  [isOnApprovedReport, isOnReport, status, userCanEdit]);

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName} className={readOnly ? 'text-bold' : ''}>
        TTA objective
        {' '}
        { !readOnly ? <Req doNotRead /> : null }
      </Label>
      { readOnly && title ? (
        <p className="margin-top-0 usa-prose">{title}</p>
      ) : (
        <>
          {error}
          <AutomaticResizingTextarea
            onUpdateText={onChangeTitle}
            onBlur={validateObjectiveTitle}
            inputName={inputName}
            disabled={isLoading}
            value={title}
          />
        </>
      )}
    </FormGroup>
  );
}

ObjectiveTitle.propTypes = {
  error: PropTypes.node.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  validateObjectiveTitle: PropTypes.func.isRequired,
  onChangeTitle: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  userCanEdit: PropTypes.bool.isRequired,
};

ObjectiveTitle.defaultProps = {
  inputName: 'objectiveTitle',
  isLoading: false,
};
