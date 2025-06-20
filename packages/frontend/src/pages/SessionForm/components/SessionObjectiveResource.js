import React from 'react';
import PropTypes from 'prop-types';
import { isValidResourceUrl } from '@ttahub/common';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import {
  TextInput,
  Label,
  Button,
  ErrorMessage,
  FormGroup,
} from '@trussworks/react-uswds';
import colors from '../../../colors';
import { noDisallowedUrls } from '../../../components/GoalForm/constants';
import './SessionObjectiveResource.scss';

export default function SessionObjectiveResource({
  errors,
  fieldErrors,
  resource,
  index,
  removeResource,
  showRemoveButton,
}) {
  const { register } = useFormContext();

  return (
    <FormGroup error={fieldErrors} className={`ttahub-session-form--objective-form-group ${fieldErrors ? 'margin-top-2' : ''}`}>
      <Label htmlFor={`objectiveResources.${index}.value`} className="usa-sr-only">
        Resource
        {' '}
        { index + 1 }
      </Label>
      <ReactHookFormError
        errors={errors}
        name={`objectiveResources.${index}.value`}
        render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
      />
      <div className="display-flex">
        <TextInput
          type="url"
          id={`objectiveResources.${index}.value`}
          name={`objectiveResources.${index}.value`}
          inputRef={register({
            validate: {
              isValidResourceUrl: (value) => {
                if (!value) return true;
                if (noDisallowedUrls([{ value }]) !== true) return noDisallowedUrls([{ value }]);
                return isValidResourceUrl(value) || 'Please enter a valid URL';
              },
            },
          })}
          defaultValue={resource.value}
        />
        { showRemoveButton ? (
          <Button className="ttahub-resource-repeater--remove-resource" unstyled type="button" onClick={() => removeResource(index)}>
            <FontAwesomeIcon className="margin-x-1" color={colors.ttahubMediumBlue} icon={faTrash} />
            <span className="usa-sr-only">
              remove resource
              {' '}
              { index + 1 }
            </span>
          </Button>
        ) : null}
      </div>
    </FormGroup>
  );
}

SessionObjectiveResource.propTypes = {
  errors: PropTypes.shape({}).isRequired,
  fieldErrors: PropTypes.shape({}),
  resource: PropTypes.shape({
    value: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  removeResource: PropTypes.func.isRequired,
  showRemoveButton: PropTypes.bool.isRequired,
};

SessionObjectiveResource.defaultProps = {
  fieldErrors: null,
};
