import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  FormGroup, Label, Button, Fieldset,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import PlusButton from './PlusButton';
import QuestionTooltip from './QuestionTooltip';
import URLInput from '../URLInput';
import colors from '../../colors';
import './ResourceRepeater.scss';

export default function ResourceRepeater({
  resources,
  setResources,
  error,
  validateResources,
  toolTipText,
  validateOnRemove,
  isLoading,
}) {
  const addResource = () => {
    const newResources = [...resources, { key: uuidv4(), value: '' }];
    setResources(newResources);
  };

  const removeResource = (i) => {
    const newResources = [...resources];
    newResources.splice(i, 1);
    setResources(newResources);

    // This is an attempt to handle on remove validation for resources.
    // the AR and RTR use two different approaches to validation.
    // This works around it by allowing the parent component to pass in a validation function.
    if (validateOnRemove) {
      validateOnRemove(newResources);
    } else {
      validateResources();
    }
  };

  const updateResource = (value, i) => {
    const newResources = [...resources];
    const toUpdate = { ...newResources[i], value: value.trim() };
    newResources.splice(i, 1, toUpdate);
    setResources(newResources);
  };

  return (
    <>
      <FormGroup error={error.props.children}>
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
          {error.props.children ? error : null}
          <div className="ttahub-resource-repeater">
            { resources.map((r, i) => (
              <div key={r.key} className="display-flex" id="resources">
                <Label htmlFor={`resource-${i + 1}`} className="sr-only">
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
                    <span className="sr-only">
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
  error: PropTypes.node.isRequired,
  validateResources: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  toolTipText: PropTypes.string,
  validateOnRemove: PropTypes.func,
};

ResourceRepeater.defaultProps = {
  isLoading: false,
  toolTipText: 'Copy & paste web address of TTA resource used for this objective. Usually an ECLKC page.',
  validateOnRemove: null,
};
