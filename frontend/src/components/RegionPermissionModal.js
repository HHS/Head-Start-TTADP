import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import { DECIMAL_BASE } from '../Constants';
import { getUserRegions } from '../permissions';
import './RegionPermissionModal.css';

function RegionPermissionModal({
  filters, user,
}) {
  const modalRef = useRef();
  const userRegions = getUserRegions(user);

  useEffect(() => {
    // Check if user has permission to region.
    const regionFilter = filters.find((f) => f.topic === 'region');
    if (regionFilter) {
      const filterRegion = regionFilter.query;
      const filterRegionNum = parseInt(filterRegion, DECIMAL_BASE);
      if (!userRegions.includes(filterRegionNum) && !modalRef.current.modalIsOpen) {
        console.log('Modal Toggle!!!!!!', !userRegions.includes(filterRegionNum), typeof filterRegion, userRegions);
        // Show region permission modal.
        modalRef.current.toggleModal(true);
      }
    }
  }, [userRegions, filters]);

  const showFilter = () => {

  };

  const requestSmartSheetAccess = () => {

  };

  return (
    <div className="smart-hub--region-permission-modal">
      <Modal
        modalRef={modalRef}
        onOk={showFilter}
        okButtonCss="usa-button--primary"
        modalId="RegionPermissionModal"
        title="You need permission to access a region"
        okButtonText="Show filter with my regions"
        secondaryOkButtonText="Request access via Smartsheet"
        onSecondaryOk={requestSmartSheetAccess}
        hideCancelButton
        isLarge
      >
        <p>
          Most TTA Hub users have access to only one region. You may have received a link from
          someone with more access.
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
};

export default RegionPermissionModal;
