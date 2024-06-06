import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Editor } from 'react-draft-wysiwyg';
import ExternalLink from '../../../../components/ExternalResourceModal';
import {
  isValidURL, isExternalURL, isInternalGovernmentLink, getEditorState,
} from '../../../../utils';

export const mapUrlValue = (v) => {
  let result = v;
  switch (v) {
    case 'recipient':
      result = 'Recipient';
      break;
    case 'regionalOffice':
      result = 'Regional Office';
      break;
    case 'other-entity':
      result = 'Other entity';
      break;
    case 'technical-assistance':
      result = 'Technical assistance';
      break;
    case 'training':
      result = 'Training';
      break;
    case 'in-person':
      result = 'In Person';
      break;
    case 'virtual':
      result = 'Virtual';
      break;
    case 'hybrid':
      result = 'Hybrid';
      break;
    default:
      break;
  }
  return result;
};

const onHubFileLinkClick = (e) => {
  e.preventDefault();
  window.open(e.target.href, '_blank');
};

const ReviewItem = ({
  label, name, path, sortValues, customValue, linkNamePath, isFile, isRichText,
}) => {
  const { watch } = useFormContext();
  let value = null;
  let values = [];
  let linkNameValues = [];
  if (!customValue) {
    value = watch(name);
    values = value;
  } else {
    value = customValue[name];
    values = value;
  }

  if (!Array.isArray(value)) {
    values = [value];
  }

  if (linkNamePath) {
    linkNameValues = values.map((v) => _.get(v, linkNamePath));
    if (!Array.isArray(linkNameValues)) {
      linkNameValues = [linkNameValues];
    }
  }

  if (path) {
    values = values.map((v) => _.get(v, path));
  }

  if (sortValues) {
    values.sort();
  }

  values = values.map((v, index) => {
    // If not a valid url, then its most likely just text, so leave it as is
    // except for several values
    if (!isValidURL(v)) {
      if (isRichText) {
        return (
          <Editor
            readOnly
            toolbarHidden
            defaultEditorState={getEditorState(v)}
          />
        );
      }
      return mapUrlValue(v);
    }

    const linkNameToUse = linkNamePath ? linkNameValues[index] : v;
    if (isFile) {
      return (
        <a href={v} onClick={onHubFileLinkClick}>
          {linkNameToUse}
        </a>
      );
    }
    if (isExternalURL(v) || isInternalGovernmentLink(v)) {
      return <ExternalLink to={v}>{linkNameToUse}</ExternalLink>;
    }

    const localLink = new URL(v);
    return <Link to={localLink.pathname}>{linkNameToUse}</Link>;
  });

  const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');

  return (
    <div className={`grid-row ${classes} margin-bottom-3 desktop:margin-bottom-0`}>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold desktop:text-normal">
        {label}
      </div>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
        {values.map((v, index) => (
          <div aria-label={`${label} ${index + 1}`} key={`${label}${v}`} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
            {Number.isNaN(v) ? '' : v}
          </div>
        ))}
      </div>
    </div>
  );
};

ReviewItem.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
  sortValues: PropTypes.bool,
  customValue: PropTypes.arrayOf(PropTypes.string),
  linkNamePath: PropTypes.string,
  isFile: PropTypes.bool,
  isRichText: PropTypes.bool,
};

ReviewItem.defaultProps = {
  path: '',
  sortValues: false,
  customValue: null,
  linkNamePath: null,
  isFile: false,
  isRichText: false,
};

export default ReviewItem;
