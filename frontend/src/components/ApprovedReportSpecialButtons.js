import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid, ModalToggleButton, Button } from '@trussworks/react-uswds';
import { canUnlockReports } from '../permissions';
import PrintToPdf from './PrintToPDF';

export default function ApprovedReportSpecialButtons({
  UnlockModal,
  modalRef,
  user,
  showUnlockReports,
  showCompleteEvent,
  completeEvent,
}) {
  const [successfullyCopiedClipboard, setSuccessfullyCopiedClipboard] = useState(false);
  const [somethingWentWrongWithClipboard, setSomethingWentWrongWithClipboard] = useState(false);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSuccessfullyCopiedClipboard(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setSomethingWentWrongWithClipboard(true);
    }
  }

  return (
    <>
      {successfullyCopiedClipboard ? (
        <div className="usa-alert usa-alert--success margin-bottom-2 no-print">
          <div className="usa-alert__body">
            <p className="usa-alert__text">Successfully copied URL</p>
          </div>
        </div>
      ) : null}
      {somethingWentWrongWithClipboard
        ? (
          <div className="usa-alert usa-alert--warning no-print">
            <div className="usa-alert__body">
              <p className="usa-alert__text">
                Sorry, something went wrong copying that url.
                {window.location.href && (
                  <>
                    {' '}
                    Here it is
                    {window.location.href}
                  </>
                )}
              </p>
            </div>
          </div>
        )
        : null}
      <Grid row>
        {navigator && navigator.clipboard
          ? <button id="approved-url" type="button" className="usa-button no-print" disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false} onClick={handleCopyUrl}>Copy URL Link</button>
          : null}
        <PrintToPdf
          id="approved-print"
          disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false}
        />
        {(showCompleteEvent && completeEvent) ? (
          <Button onClick={completeEvent}>
            Complete event
          </Button>
        ) : null}
        {showUnlockReports && user && user.permissions && canUnlockReports(user)
          ? <ModalToggleButton type="button" className="usa-button usa-button--outline no-print" modalRef={modalRef} opener>Unlock report</ModalToggleButton>
          : null}
      </Grid>
      {showUnlockReports && <UnlockModal /> }
    </>
  );
}

ApprovedReportSpecialButtons.propTypes = {
  UnlockModal: PropTypes.node,
  user: PropTypes.shape({
    permissions: PropTypes.arrayOf(PropTypes.string),
  }),
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]),
  showUnlockReports: PropTypes.bool,
  completeEvent: PropTypes.func,
  showCompleteEvent: PropTypes.bool,
};

ApprovedReportSpecialButtons.defaultProps = {
  UnlockModal: <></>,
  modalRef: null,
  showUnlockReports: false,
  user: null,
  completeEvent: null,
  showCompleteEvent: false,
};
