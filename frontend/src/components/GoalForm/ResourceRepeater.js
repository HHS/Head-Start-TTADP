import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  FormGroup, Label, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import PlusButton from './PlusButton';
import QuestionTooltip from './QuestionTooltip';
import URLInput from '../URLInput';
import UnusedData from './UnusedData';
import colors from '../../colors';
import './ResourceRepeater.css';

export default function ResourceRepeater({
  resources,
  setResources,
  error,
  validateResources,
  status,
  isOnReport,
  isLoading,
  goalStatus,
  userCanEdit,
}) {
  const resourcesWrapper = useRef();

  const readOnly = status === 'Suspended' || (goalStatus === 'Not Started' && isOnReport) || goalStatus === 'Closed';

  if (readOnly) {
    const onlyResourcesWithValues = resources.filter((resource) => resource.value);
    if (!onlyResourcesWithValues.length) {
      return null;
    }

    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">Resource links</p>
        <ul className="usa-list usa-list--unstyled">
          {onlyResourcesWithValues.map((resource) => (
            !(status === 'Complete' && goalStatus === 'Closed') || resource.onAnyReport ? (
              <li key={uuidv4()}>
                <a href={resource.value}>{resource.value}</a>
              </li>
            ) : <UnusedData key={uuidv4()} value={resource.value} isLink />
          ))}
        </ul>
      </>
    );
  }

  const { editableResources, fixedResources } = resources.reduce((acc, resource) => {
    if (resource.onAnyReport || !userCanEdit) {
      acc.fixedResources.push(resource);
    } else {
      acc.editableResources.push(resource);
    }

    return acc;
  }, { editableResources: [], fixedResources: [] });

  const addResource = () => {
    const newResources = [...editableResources, { key: uuidv4(), value: '' }];
    setResources(newResources);
  };

  const removeResource = (i) => {
    const newResources = [...editableResources];
    newResources.splice(i, 1);
    setResources(newResources);
  };

  const updateResource = (value, i) => {
    const newResources = [...editableResources];
    const toUpdate = { ...newResources[i], value };
    newResources.splice(i, 1, toUpdate);
    setResources(newResources);
  };

  return (
    <>
      { fixedResources.length ? (
        <>
          <p className="usa-prose text-bold margin-bottom-0">Resource links</p>
          <ul className="usa-list usa-list--unstyled">
            {fixedResources.map((resource) => (
              <li key={resource.key}><a href={resource.value}>{resource.value}</a></li>
            ))}
          </ul>
        </>
      ) : null }

      { userCanEdit ? (
        <FormGroup error={error.props.children}>
          <div ref={resourcesWrapper}>
            <Label htmlFor="resources" className={fixedResources.length ? 'text-bold' : ''}>
              {!fixedResources.length ? 'Resource links' : 'Add resource link'}
              <QuestionTooltip
                text="Copy and paste addresses of web pages describing resources used for this objective. Usually this is an ECLKC page."
              />
            </Label>
            {error}
            <div className="ttahub-resource-repeater">
              { editableResources.map((r, i) => (
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
                    value={r.value}
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
      ) : null }
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
  status: PropTypes.string.isRequired,
  isOnReport: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
  ]).isRequired,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
};

ResourceRepeater.defaultProps = {
  isLoading: false,
};
