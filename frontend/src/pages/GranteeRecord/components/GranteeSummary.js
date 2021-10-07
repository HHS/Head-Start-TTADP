import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';

export default function GranteeSummary({ summary }) {
  if (!summary || !summary.grants) {
    return null;
  }

  return (
    <Container padding={0} className="ttahub--grantee-summary">
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3">Grantee Summary</h2>
      <div className="padding-x-3 padding-bottom-3">
        <p><strong>Region</strong></p>
        { summary.grants.map((grant) => (
          <p key={`${grant.id}_regionId`}>
            Region
            {' '}
            {grant.regionId}
          </p>
        ))}
        <p><strong>Grantee ID</strong></p>
        <p>
          {summary.granteeId}
        </p>
        <p><strong>Grantee Type</strong></p>
        { summary.grants.map((grant) => (
          <p key={`${grant.id}_granteeType`}>
            {grant.granteeType}
          </p>
        ))}
        <p><strong>Program Specialist</strong></p>
        { summary.grants.map((grant) => (
          <p key={`${grant.id}_programSpecialist`}>
            {grant.programSpecialistName}
          </p>
        ))}
      </div>

    </Container>
  );
}

GranteeSummary.propTypes = {
  summary: PropTypes.shape({
    granteeId: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        number: PropTypes.string,
        status: PropTypes.string,
        endDate: PropTypes.string,
      }),
    ),
  }),
};

GranteeSummary.defaultProps = {
  summary: {
    granteeId: '',
    grants: [],
  },
};
