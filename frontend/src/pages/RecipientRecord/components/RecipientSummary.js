import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './RecipientSummary.css';
import { getDistinctSortedArray } from '../../../utils';

function RecipientInformationSection({
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

RecipientInformationSection.propTypes = {
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

RecipientInformationSection.defaultProps = {
  distinct: false,
};

export default function RecipientSummary({ summary, regionId }) {
  if (!summary || !summary.grants) {
    return null;
  }

  return (
    <Container padding={0} className="ttahub--recipient-summary">
      <h2 className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0">Recipient Summary</h2>
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
          <p className="margin-y-1"><strong>Recipient ID</strong></p>
          <p className="margin-y-1">
            {summary.recipientId}
          </p>
        </div>
        <RecipientInformationSection heading="Recipient Type" property="recipientType" grants={[{ recipientType: summary.recipientType }]} />
        <RecipientInformationSection heading="Program Specialist" property="programSpecialistName" grants={summary.grants} distinct />
        <RecipientInformationSection heading="Grant Specialist" property="grantSpecialistName" grants={summary.grants} distinct />
      </div>

    </Container>
  );
}

RecipientSummary.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  summary: PropTypes.shape({
    recipientId: PropTypes.string,
    recipientType: PropTypes.string,
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

RecipientSummary.defaultProps = {
  summary: {
    recipientId: '',
    recipientType: '',
    grants: [],
  },
};
