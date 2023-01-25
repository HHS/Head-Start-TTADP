import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Grid, ModalToggleButton } from '@trussworks/react-uswds';
import { Redirect } from 'react-router-dom';
import moment from 'moment-timezone';
import { Helmet } from 'react-helmet';
import { getReport, unlockReport } from '../../fetchers/activityReports';
import { allRegionsUserHasPermissionTo, canUnlockReports } from '../../permissions';
import Modal from '../../components/Modal';
import Container from '../../components/Container';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from '../../Constants';
import PrintToPdf from '../../components/PrintToPDF';
import './index.scss';
import ApprovedReportV1 from './components/ApprovedReportV1';
import ApprovedReportV2 from './components/ApprovedReportV2';

export default function ApprovedActivityReport({ match, user }) {
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [somethingWentWrong, setSomethingWentWrong] = useState(false);
  const [successfullyCopiedClipboard, setSuccessfullyCopiedClipboard] = useState(false);
  const [somethingWentWrongWithClipboard, setSomethingWentWrongWithClipboard] = useState(false);
  const [justUnlocked, updatedJustUnlocked] = useState(false);

  const [report, setReport] = useState({
    version: 'loading',
    reportId: 0,
    displayId: '',
    recipientType: 'Recipient',
    activityRecipients: [],
    targetPopulations: [],
    approvers: [],
    activityReportCollaborators: [],
    participants: [],
    numberOfParticipants: 0,
    reason: [],
    author: { fullName: '' },
    createdAt: '',
    approvedAt: '',
    recipientNextSteps: [],
    specialistNextSteps: [],
    goalsAndObjectives: [],
    objectivesWithoutGoals: [],
    context: '',
    additionalNotes: '',
    files: [],
    ECLKCResourcesUsed: [],
    nonECLKCResourcesUsed: [],
    topics: [],
    requester: '',
    virtualDeliveryType: '',
    duration: 0,
    endDate: '',
    startDate: '',
    creatorNotes: '',
    ttaType: ['Training'],
  });

  const modalRef = useRef();

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(report.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Local storage may not be available: ', e);
    }
  },
  [report.id]);

  useEffect(() => {
    const allowedRegions = allRegionsUserHasPermissionTo(user);

    if (!parseInt(match.params.activityReportId, 10)) {
      setSomethingWentWrong(true);
      return;
    }

    async function fetchReport() {
      try {
        const data = await getReport(match.params.activityReportId);
        if (!allowedRegions.includes(data.regionId)) {
          setNotAuthorized(true);
          return;
        }

        // review and submit table
        setReport(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
        setSomethingWentWrong(true);
      }
    }

    fetchReport();
  }, [match.params.activityReportId, user]);

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

  if (notAuthorized) {
    return (
      <>
        <Helmet>
          <title>Not authorized to view activity report</title>
        </Helmet>
        <div className="usa-alert usa-alert--error no-print" role="alert">
          <div className="usa-alert__body">
            <h4 className="usa-alert__heading">Unauthorized</h4>
            <p className="usa-alert__text">
              Sorry, you are not allowed to view this report
            </p>
          </div>
        </div>
      </>
    );
  }

  if (somethingWentWrong) {
    return (
      <>
        <Helmet>
          <title>Error displaying activity report - TTAHUB</title>
        </Helmet>
        <div className="usa-alert usa-alert--warning no-print">
          <div className="usa-alert__body">
            <p className="usa-alert__text">
              Sorry, something went wrong.
            </p>
          </div>
        </div>
      </>
    );
  }
  const {
    id: reportId,
    displayId,
    author,
    startDate,
    version,
  } = report;

  const ReportComponent = () => {
    switch (version) {
      case 1:
        return <ApprovedReportV1 data={report} />;
      case 2:
        return <ApprovedReportV2 data={report} />;
      case 'loading':
        return <Container className="ttahub-activity-report-view margin-top-2 minh-tablet">Loading...</Container>;
      default:
        return <ApprovedReportV1 data={report} />;
    }
  };

  const onUnlock = async () => {
    await unlockReport(reportId);
    modalRef.current.toggleModal(false);
    updatedJustUnlocked(true);
  };

  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId,
    displayId,
    status: 'unlocked',
  };

  return (
    <>
      {justUnlocked && <Redirect to={{ pathname: '/activity-reports', state: { message } }} />}
      <Helmet>
        <title>
          {displayId}
          {' '}
          {author.fullName}
          {' '}
          {startDate}
        </title>
      </Helmet>
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
          ? <button id="approved-URL" type="button" className="usa-button no-print" disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false} onClick={handleCopyUrl}>Copy URL Link</button>
          : null}
        <PrintToPdf
          id="approved-print"
          disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false}
        />
        {user && user.permissions && canUnlockReports(user)
          ? <ModalToggleButton type="button" className="usa-button usa-button--outline no-print" modalRef={modalRef} opener>Unlock report</ModalToggleButton>
          : null}
      </Grid>
      <Modal
        modalRef={modalRef}
        onOk={() => onUnlock()}
        modalId="UnlockReportModal"
        title="Unlock Activity Report"
        okButtonText="Unlock"
        okButtonAriaLabel="Unlock approved report will redirect to activity report page."
      >
        <>
          Are you sure you want to unlock this activity report?
          <br />
          <br />
          The report status will be set to
          {' '}
          <b>NEEDS ACTION</b>
          {' '}
          and
          {' '}
          <br />
          must be re-submitted for approval.
        </>
      </Modal>
      {ReportComponent()}
    </>
  );
}
ApprovedActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};
