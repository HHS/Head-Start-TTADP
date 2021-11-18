import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';

function GranteeInformationSection({ heading, grants, property }) {
  return (
    <div className="margin-bottom-2">
      <p className="margin-y-1"><strong>{heading}</strong></p>
      { grants.map((grant) => (
        <p className="margin-y-1" key={`${grant.id}_${property}`}>
          {grant[property]}
        </p>
      ))}
    </div>
  );
}

GranteeInformationSection.propTypes = {
  heading: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  grants: PropTypes.arrayOf(PropTypes.shape({
    number: PropTypes.string,
    status: PropTypes.string,
    endDate: PropTypes.string,
    id: PropTypes.number,
  })).isRequired,
};

export default function GranteeSummary({ summary, regionId }) {
  if (!summary || !summary.grants) {
    return null;
  }

  console.log(summary);

  return (
    <Container padding={0} className="ttahub--grantee-summary">
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3 margin-bottom-0">Grantee Summary</h2>
      <div className="padding-x-3 padding-bottom-3">
        <div className="margin-bottom-2">
          <p className="margin-y-1"><strong>Region</strong></p>
          <p className="margin-y-1">
            Region
            {' '}
            {regionId}
          </p>
        </div>
        <div className="margin-bottom-2">
          <p className="margin-y-1"><strong>Grantee ID</strong></p>
          <p className="margin-y-1">
            {summary.granteeId}
          </p>
        </div>
        <GranteeInformationSection heading="Grantee Type" property="granteeType" grants={summary.grants} />
        <GranteeInformationSection heading="Program Specialist" property="programSpecialistName" grants={summary.grants} />
      </div>

    </Container>
  );
}

GranteeSummary.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  summary: PropTypes.shape({
    granteeId: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        number: PropTypes.string,
        status: PropTypes.string,
        endDate: PropTypes.string,
        id: PropTypes.number,
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
