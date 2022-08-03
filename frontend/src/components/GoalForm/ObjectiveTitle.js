import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';

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
}) {
  const readOnly = useMemo(() => (isOnApprovedReport || status === 'Complete' || status === 'Suspended' || (status === 'Not Started' && isOnReport) || (status === 'In Progress' && isOnReport)),
    [isOnApprovedReport, isOnReport, status]);

  return (
    <FormGroup className="margin-top-1" error={error.props.children}>
      <Label htmlFor={inputName} className={readOnly ? 'text-bold' : ''}>
        TTA objective
        {' '}
        { !readOnly ? <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span> : null }
      </Label>
      { readOnly && title ? (
        <p className="margin-top-0 usa-prose">{title}</p>
      ) : (
        <>
          {error}
          <Textarea
            id={inputName}
            name={inputName}
            value={title}
            onChange={onChangeTitle}
            onBlur={validateObjectiveTitle}
            required
            disabled={isLoading}
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
};

ObjectiveTitle.defaultProps = {
  inputName: 'objectiveTitle',
  isLoading: false,
};
