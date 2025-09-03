import React from 'react';
import { isValidResourceUrl } from '@ttahub/common';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  FormGroup,
  Label,
  Button,
  Fieldset,
  ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import PlusButton from './PlusButton';
import QuestionTooltip from '../QuestionTooltip';
import URLInput from '../URLInput';
import colors from '../../colors';
import './ResourceRepeater.scss';

export default function ResourceRepeater({
  resources,
  setResources,
  error,
  validateResources,
  toolTipText,
  isLoading,
}) {
  const addResource = () => {
    if ((error) || resources.some((r) => !r.value)) {
      return;
    }
    const newResources = [...resources, { key: uuidv4(), value: '' }];
    setResources(newResources);
  };

  const removeResource = (i) => {
    const newResources = [...resources];
    newResources.splice(i, 1);
    setResources(newResources);
    validateResources();
  };

  const updateResource = (value, i) => {
    const newResources = [...resources];
    const toUpdate = { ...newResources[i], value: value.trim() };
    newResources.splice(i, 1, toUpdate);
    setResources(newResources);
  };

  return (
    <>
      <FormGroup error={!!(error)}>
        <div>
          <Fieldset>
            <legend>
              Did you use any other TTA resources that are available as a link?
              <QuestionTooltip
                text={toolTipText}
              />
            </legend>
            <span className="usa-hint">
              Enter one resource per field. To enter more resources, select “Add new resource”
            </span>
          </Fieldset>
          <ErrorMessage>
            {error}
          </ErrorMessage>
          <div className="ttahub-resource-repeater">
            { resources.map((r, i) => (
              <div key={r.key} className={`display-flex${r.value && !isValidResourceUrl(r.value) ? ' ttahub-resource__error' : ''}`} id="resources">
                <Label htmlFor={`resource-${i + 1}`} className="usa-sr-only">
                  Resource
                  {' '}
                  { i + 1 }
                </Label>
                <URLInput
                  id={`resource-${i + 1}`}
                  onBlur={validateResources}
                  onChange={({ target: { value } }) => updateResource(value, i)}
                  value={r.value || ''}
                  disabled={isLoading}
                />
                { resources.length > 1 ? (
                  <Button unstyled type="button" onClick={() => removeResource(i)}>
                    <FontAwesomeIcon className="margin-x-1" color={colors.ttahubMediumBlue} icon={faTrash} />
                    <span className="usa-sr-only">
                      remove resource
                      {' '}
                      { i + 1 }
                    </span>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="ttahub-resource-repeater--add-new margin-top-1 margin-bottom-3">
            <PlusButton text="Add new resource" onClick={addResource} />
          </div>
        </div>
      </FormGroup>
    </>
  );
}

ResourceRepeater.propTypes = {
  resources: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    value: PropTypes.string,
  })).isRequired,
  setResources: PropTypes.func.isRequired,
  error: PropTypes.string,
  validateResources: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  toolTipText: PropTypes.string,
};

ResourceRepeater.defaultProps = {
  error: '',
  isLoading: false,
  toolTipText: 'Copy & paste web address of TTA resource used for this objective. Usually a HeadStart.gov page.',
};
