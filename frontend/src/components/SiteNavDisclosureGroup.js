import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import './SiteNavDisclosureGroup.scss';

export default function SiteNavDisclosureGroup({ children, title }) {
  return (
    <details className="ttahub-site-nav--disclosure-group" open>
      <summary className="display-flex flex-justify flex-align-center border-left-05 border-transparent padding-x-2">
        {title}
        <FontAwesomeIcon className="ttahub-site-nav--disclosure-group__open" icon={faPlus} />
        <FontAwesomeIcon className="ttahub-site-nav--disclosure-group__close" icon={faMinus} />
      </summary>
      <ul className="add-list-reset padding-x-2">
        {children}
      </ul>
    </details>
  );
}

SiteNavDisclosureGroup.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
};
