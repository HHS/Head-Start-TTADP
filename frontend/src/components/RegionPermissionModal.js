import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import { DECIMAL_BASE } from '../Constants';
import { getUserRegions } from '../permissions';
import './RegionPermissionModal.css';

function RegionPermissionModal({
  filters, user, showFilterWithMyRegions,
}) {
  const modalRef = useRef();
  const userRegions = getUserRegions(user);

  useEffect(() => {
    // Check if user has permission to region.
    const regionFilters = filters.filter((f) => f.topic === 'region' && f.condition !== 'is not');
    if (regionFilters.length > 0) {
      let showRegionPermissionsModal = false;
      const deniedRegionsList = [];
      regionFilters.forEach((f) => {
        const filterRegion = f.query;
        const filterRegionNum = parseInt(filterRegion, DECIMAL_BASE);
        if (!userRegions.includes(filterRegionNum)) {
          showRegionPermissionsModal = true;
          deniedRegionsList.push(filterRegionNum);
        }
      });

      if (showRegionPermissionsModal && !modalRef.current.modalIsOpen) {
        // Show region permission modal.
        modalRef.current.toggleModal(true);
      }
    }
  }, [userRegions, filters]);

  const showFilterWithMyRegionAccess = () => {
    showFilterWithMyRegions();
    modalRef.current.toggleModal(false);
  };

  const smartSheetAccessLink = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
  const requestSmartSheetAccess = () => {
    // Open link in new tab and close modal.
    window.open(smartSheetAccessLink, '_blank');
    showFilterWithMyRegions();
    modalRef.current.toggleModal(false);
  };

  return (
    <div className="smart-hub--region-permission-modal">
      <Modal
        modalRef={modalRef}
        onOk={showFilterWithMyRegionAccess}
        okButtonCss="usa-button--primary"
        modalId="RegionPermissionModal"
        title="You need permission to access this region"
        okButtonText="Show filter with my regions"
        secondaryActionButtonText="Request access via Smartsheet"
        onSecondaryAction={requestSmartSheetAccess}
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
