import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Alert } from '@trussworks/react-uswds';

export default function PocCompleteView({ formData, userId, children }) {
  const formattedDate = moment(formData.pocCompleteDate, 'YYYY-MM-DD').format('MM/DD/YYYY');

  let message = `A regional point of contact completed your portion of the session report on ${formattedDate} and sent an email to the event creator and collaborator`;
  if (userId === Number(formData.pocCompleteId)) {
    message = `You completed your portion of the session report on ${formattedDate} and sent an email to the event creator and collaborator`;
  }
  return (
    <>
      <Alert type="info">
        <p className="usa-alert__text">
          {message}
        </p>
      </Alert>
      { children }
    </>
  );
}

PocCompleteView.propTypes = {
  formData: PropTypes.shape({
    pocCompleteDate: PropTypes.string,
    pocCompleteId: PropTypes.number,
  }).isRequired,
  userId: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};
