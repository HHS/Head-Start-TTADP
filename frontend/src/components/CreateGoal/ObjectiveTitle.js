import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';

export default function ObjectiveTitle({
  error,
  isOnReport,
  title,
  onChangeTitle,
  validateObjectiveTitle,
}) {
  return (
    <FormGroup className="margin-top-1" error={error.props.children}>
      <Label htmlFor="objectiveTitle" className={isOnReport ? 'text-bold' : ''}>
        TTA objective
        {' '}
        { !isOnReport ? <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span> : null }
      </Label>
      { isOnReport && title ? (
        <p className="margin-top-0 usa-prose">{title}</p>
      ) : (
        <>
          {error}
          <Textarea id="objectiveTitle" name="objectiveTitle" required value={title} onChange={onChangeTitle} onBlur={validateObjectiveTitle} />
        </>
      )}
    </FormGroup>
  );
}

ObjectiveTitle.propTypes = {
  error: PropTypes.node.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  validateObjectiveTitle: PropTypes.func.isRequired,
  onChangeTitle: PropTypes.func.isRequired,
};
