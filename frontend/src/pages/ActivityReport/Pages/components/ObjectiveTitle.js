import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../../../../components/AutomaticResizingTextarea';
import Req from '../../../../components/Req';

export default function ObjectiveTitle({
  error,
  isOnApprovedReport,
  title,
  onChangeTitle,
  validateObjectiveTitle,
  inputName,
  isLoading,
  parentGoal,
  initialObjectiveStatus,
}) {
  const readOnly = useMemo(() => {
    if (isOnApprovedReport) {
      return true;
    }

    if (parentGoal && parentGoal.status === 'Closed') {
      return true;
    }

    if (initialObjectiveStatus === 'Complete' || initialObjectiveStatus === 'Suspended') {
      return true;
    }

    return false;
  }, [isOnApprovedReport, initialObjectiveStatus, parentGoal]);

  return (
    <FormGroup className="margin-top-1" error={error.props.children}>
      <Label htmlFor={inputName} className={readOnly ? 'text-bold' : ''}>
        TTA objective
        {' '}
        { !readOnly ? <Req doNotRead /> : null }
      </Label>
      { readOnly && title ? (
        <p className="margin-top-0 usa-prose" data-testid="readonly-objective-text">{title}</p>
      ) : (
        <>
          {error}
          <AutomaticResizingTextarea
            key={inputName}
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
  title: PropTypes.string.isRequired,
  validateObjectiveTitle: PropTypes.func.isRequired,
  onChangeTitle: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  parentGoal: PropTypes.shape({
    id: PropTypes.number,
    status: PropTypes.string,
  }).isRequired,
  initialObjectiveStatus: PropTypes.string.isRequired,
};

ObjectiveTitle.defaultProps = {
  inputName: 'objectiveTitle',
  isLoading: false,
};
