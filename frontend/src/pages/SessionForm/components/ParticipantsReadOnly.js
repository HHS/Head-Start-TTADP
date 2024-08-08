import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { capitalize } from 'lodash';
import ReadOnlyField from '../../../components/ReadOnlyField';

export default function ParticipantsReadOnly({ formData }) {
  const isHybrid = formData.deliveryMethod === 'hybrid';
  const isIstVisit = formData.isIstVisit === 'yes';
  const isNotIstVisit = formData.isIstVisit === 'no';

  return (
    <>
      <Helmet>
        <title>Session Participants</title>
      </Helmet>
      {isNotIstVisit && (
      <ReadOnlyField label="Recipients">
        {formData.recipients.map((r) => r.label).join('\n')}
      </ReadOnlyField>
      )}
      {isIstVisit && (
      <ReadOnlyField label="Regional Office/TTA">
        {formData.regionalOfficeTta.join(', ')}
      </ReadOnlyField>
      )}

      {isHybrid ? (
        <>
          <ReadOnlyField label="Number of participants attending in person">
            {formData.numberOfParticipantsInPerson}
          </ReadOnlyField>
          <ReadOnlyField label="Number of participants attending virtually">
            {formData.numberOfParticipantsVirtually}
          </ReadOnlyField>
        </>
      ) : (
        <ReadOnlyField label="Number of participants">
          {formData.numberOfParticipants}
        </ReadOnlyField>
      )}
      <ReadOnlyField label="Recipient participants">
        {formData.participants.join('\n')}
      </ReadOnlyField>
      <ReadOnlyField label="Delivery method">
        {capitalize(formData.deliveryMethod)}
      </ReadOnlyField>
      <ReadOnlyField label="Language used">
        {formData.language.join('\n')}
      </ReadOnlyField>
    </>
  );
}

ParticipantsReadOnly.propTypes = {
  formData: PropTypes.shape({
    recipients: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
    })),
    numberOfParticipants: PropTypes.number,
    numberOfParticipantsInPerson: PropTypes.number,
    numberOfParticipantsVirtually: PropTypes.number,
    participants: PropTypes.arrayOf(PropTypes.string),
    deliveryMethod: PropTypes.string,
    language: PropTypes.arrayOf(PropTypes.string),
    isIstVisit: PropTypes.string,
    regionalOfficeTta: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
