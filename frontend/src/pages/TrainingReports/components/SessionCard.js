import React, { useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { Link } from 'react-router-dom';
import { ModalToggleButton, Button } from '@trussworks/react-uswds';
import UserContext from '../../../UserContext';
import Modal from '../../../components/VanillaModal';
import {
  InProgress,
  Closed,
  NoStatus,
  Pencil,
  Trash,
} from '../../../components/icons';
import isAdmin from '../../../permissions';
import './SessionCard.scss';

const CardData = ({ label, children }) => (
  <li className="ttahub-session-card__card-data desktop:padding-bottom-05 flex-align-start padding-bottom-1">
    <p className="ttahub-session-card__card-data-label usa-prose margin-y-0 margin-right-3 minw-15 text-bold">
      {label}
      {' '}
    </p>
    {children}
  </li>
);

CardData.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function SessionCard({
  eventId,
  session,
  expanded,
  isWriteable,
  onRemoveSession,
  eventStatus,
  isPoc,
  isOwner,
  isCollaborator,
}) {
  const modalRef = useRef();
  const { approverId } = session;
  const {
    sessionName,
    startDate,
    endDate,
    objective,
    objectiveSupportType,
    objectiveTopics,
    objectiveTrainers,
    status,
    pocComplete,
    ownerComplete,
    submitted,
  } = session.data;

  const getSessionDisplayStatusText = () => {
    switch (status) {
      case TRAINING_REPORT_STATUSES.IN_PROGRESS:
      case TRAINING_REPORT_STATUSES.COMPLETE:
        return status;
      default:
        return TRAINING_REPORT_STATUSES.NOT_STARTED;
    }
  };

  const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
  const { user } = useContext(UserContext);
  const isAdminUser = isAdmin(user);
  const isSessionApprover = user.id === approverId;

  const displaySessionStatus = getSessionDisplayStatusText();

  const getSessionStatusIcon = (() => {
    if (displaySessionStatus === TRAINING_REPORT_STATUSES.IN_PROGRESS) {
      return <InProgress />;
    } if (displaySessionStatus === TRAINING_REPORT_STATUSES.COMPLETE) {
      return <Closed />;
    }
    return <NoStatus />;
  })();

  const showSessionEdit = () => {
    if (submitted && !isSessionApprover) {
      return false;
    }

    // If they are a POC and POC work is complete, they should not be able to edit the session.
    if (isPoc && pocComplete && !isAdminUser) {
      return false;
    }

    // eslint-disable-next-line max-len
    // If they are the owner and owner work is complete, they should not be able to edit the session.
    if (((isOwner || isCollaborator) && !isAdminUser) && ownerComplete) {
      return false;
    }

    // First if both general poc and owner status is blocked make sure they are not and admin.
    if (!isAdminUser && (!isWriteable || statusIsComplete)) {
      return false;
    }

    // Admin can edit the session until the EVENT is complete.
    if (isAdminUser && eventStatus === TRAINING_REPORT_STATUSES.COMPLETE) {
      return false;
    }

    return true;
  };

  return (
    <ul className="ttahub-session-card__session-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!expanded}>
      { expanded ? (
        <Modal
          modalRef={modalRef}
          heading="Are you sure you want to delete this session?"
        >
          <p>Any information you entered will be lost.</p>
          <ModalToggleButton closer modalRef={modalRef} data-focus="true" className="margin-right-1">Cancel</ModalToggleButton>
          <Button
            type="button"
            className="usa-button--subtle"
            onClick={() => {
              onRemoveSession(session);
            }}
          >
            Delete
          </Button>
        </Modal>
      ) : null }
      <CardData label="Session name">
        <div className="desktop:display-flex">
          <p className="usa-prose desktop:margin-y-0 margin-top-0 margin-bottom-1 margin-right-2">
            {sessionName}
          </p>
          {
            showSessionEdit()
              && (
                <div className="padding-bottom-2 padding-top-1 desktop:padding-y-0">
                  <Link to={`/training-report/${eventId}/session/${session.id}`} className="margin-right-4">
                    <Pencil />
                    Edit session
                  </Link>
                  <ModalToggleButton modalRef={modalRef} unstyled className="text-decoration-underline">
                    <Trash />
                    Delete session
                  </ModalToggleButton>
                </div>
              )
          }
        </div>
      </CardData>

      <CardData label="Session dates">
        {`${startDate || ''} - ${endDate || ''}`}
      </CardData>

      <CardData label="Session objective">
        {objective}
      </CardData>

      <CardData label="Support type">
        {objectiveSupportType}
      </CardData>

      <CardData label="Topics">
        {objectiveTopics && objectiveTopics.length > 0 ? objectiveTopics.join(', ') : ''}
      </CardData>

      <CardData label="Trainers">
        {objectiveTrainers && objectiveTrainers.length > 0 ? objectiveTrainers.join(', ') : ''}
      </CardData>

      <CardData label="Status">
        {getSessionStatusIcon}
        {displaySessionStatus}
      </CardData>
    </ul>
  );
}

export const sessionPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  data: PropTypes.shape({
    regionId: PropTypes.number.isRequired,
    sessionName: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    objective: PropTypes.string.isRequired,
    objectiveSupportType: PropTypes.string.isRequired,
    objectiveTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
    objectiveTrainers: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.oneOf([
      'In progress',
      'Complete',
      'Needs status',
    ]),
    pocComplete: PropTypes.bool.isRequired,
    submitted: PropTypes.bool,
    ownerComplete: PropTypes.bool.isRequired,
  }).isRequired,
  approverId: PropTypes.number,
});
SessionCard.propTypes = {
  eventId: PropTypes.number.isRequired,
  session: sessionPropTypes.isRequired,
  expanded: PropTypes.bool.isRequired,
  isWriteable: PropTypes.bool.isRequired,
  onRemoveSession: PropTypes.func.isRequired,
  eventStatus: PropTypes.string.isRequired,
  isPoc: PropTypes.bool.isRequired,
  isOwner: PropTypes.bool.isRequired,
  isCollaborator: PropTypes.bool.isRequired,
};
export default SessionCard;
