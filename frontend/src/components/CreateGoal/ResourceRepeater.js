import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  FormGroup, Label, TextInput, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import PlusButton from './PlusButton';
import QuestionTooltip from './QuestionTooltip';

export default function ResourceRepeater({
  resources, setResources, error, validateResources, isOnApprovedReport,
}) {
  const resourcesWrapper = useRef();
  if (isOnApprovedReport) {
    return null;
  }

  const addResource = () => {
    const newResources = [...resources, { key: uuidv4(), value: '' }];
    setResources(newResources);
  };

  const removeResource = (i) => {
    const newResources = [...resources];
    newResources.splice(i, 1);
    setResources(newResources);
  };

  const updateResource = (value, i) => {
    const newResources = [...resources];
    const toUpdate = { ...newResources[i], value };
    newResources.splice(i, 1, toUpdate);
    setResources(newResources);
  };

  const areAllResourcesValid = resources.reduce((acc, curr) => acc && curr.value, resourcesWrapper.current && !resourcesWrapper.current.querySelector(':invalid'));

  return (
    <FormGroup error={error.props.children}>
      <div ref={resourcesWrapper}>
        <Label htmlFor="resources">
          Links to TTA resource used
          <QuestionTooltip
            text="Copy and paste addresses of web pages describing resources used for this objective. Usually this is an ECLKC page."
          />
        </Label>
        {error}
        { resources.map((r, i) => (
          <div key={r.key} className="display-flex" id="resources">
            <Label htmlFor={`resource-${i + 1}`} className="sr-only">
              Resource
              {' '}
              { i + 1 }
            </Label>
            <TextInput id={`resource-${i + 1}`} onBlur={validateResources} type="url" placeholder="https://" onChange={({ target: { value } }) => updateResource(value, i)} value={r.value} />
            { i > 0 ? (
              <Button unstyled type="button" onClick={() => removeResource(i)}>
                <FontAwesomeIcon className="margin-x-1" color="#005ea2" icon={faTrash} />
                <span className="sr-only">
                  remove resource
                  {' '}
                  { i + 1 }
                </span>
              </Button>
            ) : null}
          </div>
        ))}

        { areAllResourcesValid ? (
          <div className="margin-top-2 margin-bottom-4">
            <PlusButton text="Add new resource" onClick={addResource} />
          </div>
        ) : null }
      </div>
    </FormGroup>
  );
}

ResourceRepeater.propTypes = {
  resources: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.string,
  })).isRequired,
  setResources: PropTypes.func.isRequired,
  error: PropTypes.node.isRequired,
  validateResources: PropTypes.func.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
};
