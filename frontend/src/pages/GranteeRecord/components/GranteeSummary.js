import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';
import { getDistinctSortedArray } from '../../../utils';

function GranteeInformationSection({
  heading, grants, property, distinct,
}) {
  let valueList = grants.map((p) => p[property]).filter((v) => v);
  if (distinct) {
    valueList = getDistinctSortedArray(valueList);
  }

  return (
    <div className="margin-bottom-2">
      <p className="margin-y-1"><strong>{heading}</strong></p>
      {
        valueList.map((item) => (
          <p className="margin-y-1" key={`${item}_${property}`}>
            {item}
          </p>
        ))
      }
    </div>
  );
}

GranteeInformationSection.propTypes = {
  heading: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  distinct: PropTypes.bool,
  grants: PropTypes.arrayOf(PropTypes.shape({
    number: PropTypes.string,
    status: PropTypes.string,
    endDate: PropTypes.string,
    id: PropTypes.number,
  })).isRequired,
};

GranteeInformationSection.defaultProps = {
  distinct: false,
};

export default function GranteeSummary({ summary, regionId }) {
  if (!summary || !summary.grants) {
    return null;
  }

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
        <GranteeInformationSection heading="Grantee Type" property="granteeType" grants={[{ granteeType: summary.granteeType }]} />
        <GranteeInformationSection heading="Program Specialist" property="programSpecialistName" grants={summary.grants} distinct />
        <GranteeInformationSection heading="Grant Specialist" property="grantSpecialistName" grants={summary.grants} distinct />
      </div>

    </Container>
  );
}

GranteeSummary.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  summary: PropTypes.shape({
    granteeId: PropTypes.string,
    granteeType: PropTypes.string,
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
    granteeType: '',
    grants: [],
  },
};
