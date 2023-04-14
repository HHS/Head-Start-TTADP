import React, {
  useEffect, useRef, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import Modal from './Modal';
import { getUserRegions } from '../permissions';
import './RegionPermissionModal.css';

function RegionPermissionModal({
  filters, user, showFilterWithMyRegions,
}) {
  const modalRef = useRef();
  const userRegions = getUserRegions(user);

  const missingRegions = useMemo(() => filters.filter((f) => f.topic === 'region'
    && f.condition !== 'is not'
    && !userRegions
      .includes(parseInt(f.query, DECIMAL_BASE)))
    .map((m) => m.query), [filters, userRegions]);

  const showMultipleRegions = missingRegions && missingRegions.length > 1 ? 's' : '';
  const missingRegionsList = missingRegions && missingRegions.length > 0 ? missingRegions.sort().join(', ') : '';

  useEffect(() => {
    if (missingRegions
        && missingRegions.length > 0
        && !modalRef.current.modalIsOpen) {
      // Show region permission modal.
      modalRef.current.toggleModal(true);
    }
  }, [missingRegions]);

  const showFilterWithMyRegionAccess = () => {
    showFilterWithMyRegions();
    modalRef.current.toggleModal(false);
  };

  const requestSmartSheetAccess = () => {
    showFilterWithMyRegions();
    modalRef.current.toggleModal(false);
  };

  const smartSheetAccessLink = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
  const openSmartSheetRequest = () => <a href={smartSheetAccessLink} className="usa-button usa-button--primary" target="_blank" rel="noreferrer" onClick={requestSmartSheetAccess}>Request access via Smartsheet</a>;
  return (
    <div className="smart-hub--region-permission-modal">
      <Modal
        modalRef={modalRef}
        onOk={showFilterWithMyRegionAccess}
        okButtonCss="usa-button--primary"
        modalId="RegionPermissionModal"
        title={`You need permission to access region${showMultipleRegions} ${missingRegionsList}`}
        okButtonText="Show filter with my regions"
        SecondaryActionButton={openSmartSheetRequest}
        hideCancelButton
        isLarge
        forceAction
      >
        <p>
          Most TTA Hub users have access to one region.
          This link might be from someone working in a different region.
        </p>
      </Modal>
    </div>
  );
}

RegionPermissionModal.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.number),
      ]),
      topic: PropTypes.string,
    }),
  ).isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }).isRequired,
  showFilterWithMyRegions: PropTypes.func.isRequired,
};

export default RegionPermissionModal;
