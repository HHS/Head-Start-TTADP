/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation, faCheck, faX,
} from '@fortawesome/free-solid-svg-icons';
import Container from '../../../components/Container';
import colors from '../../../colors';
import IndicatorCounter from './IndicatorCounter';
import { getRecipientSpotlight } from '../../../fetchers/recipientSpotlight';
import NoResultsFound from '../../../components/NoResultsFound';
import './RecipientSpotlight.scss';

const sampleSpotlightData = [
  {
    recipientId: 1,
    regionId: 1,
    recipientName: 'Recipient A',
    grantIds: [1, 2, 3],
    childIncidents: true,
    deficiency: false,
    newRecipients: true,
    newStaff: false,
    noTTA: true,
    DRS: false,
    FEI: false,
  },
];
/*
const goodSampleSpotlightData = [
  {
    recipientId: 1,
    regionId: 1,
    recipientName: 'Recipient A',
    grantIds: [1, 2, 3],
    childIncidents: false,
    deficiency: false,
    newRecipients: false,
    newStaff: false,
    noTTA: false,
    DRS: false,
    FEI: false,
  },
];
*/

const createRowForEachIndicator = (name, label, value, description) => ({
  name, label, value, description,
});
const mappedData = (data) => ([
  createRowForEachIndicator('childIncidents', 'Child incidents', data.childIncidents, 'Recipient has experienced more than one child incident cited in a RAN in the last 12 months'),
  createRowForEachIndicator('deficiency', 'Deficiency', data.deficiency, 'Recipient has at least one active monitoring deficiency'),
  createRowForEachIndicator('DRS', 'DRS', data.DRS, 'Recipient meets the conditions for the Designation Renewal System (DRS)'),
  createRowForEachIndicator('FEI', 'FEI', data.FEI, 'Recipient is currently in the Full Enrollment Initiative (FEI)'),
  createRowForEachIndicator('newRecipients', 'New recipients', data.newRecipients, 'Recipient is in the first 4 years as a Head Start program with no previous OHS grant'),
  createRowForEachIndicator('newStaff', 'New staff', data.newStaff, 'Recipient has changed the name of the director or fiscal officer within the last two years in HSES, signifying a key hire'),
  createRowForEachIndicator('noTTA', 'No TTA', data.noTTA, 'Recipient does not have any TTA reports in last 12 months'),
]);

export default function RecipientSpotlight({ regionId, recipientId }) {
  const [spotlightData, setSpotlightData] = useState([]);
  const [hasResults, setHasResults] = useState(true);
  const [useGoodData, setUseGoodData] = useState(false);

  useEffect(() => {
    /*
    async function fetchRecipientSpotlight() {
      try {
        const response = await getRecipientSpotlight(
          String(recipientId),
          String(regionId),
        );

        // Check if response is valid and has meaningful data (more than just an empty object)
        const hasValidData = response
          && response.length > 0
          && response[0]
          && Object.keys(response[0]).length > 1;

        if (hasValidData) {
          setSpotlightData(mappedData(response[0]));
          setHasResults(true);
        } else {
          setSpotlightData([]);
          setHasResults(false);
        }
      } catch (err) {
        setSpotlightData([]);
        setHasResults(false);
      }
    }
    fetchRecipientSpotlight();
    */
    setSpotlightData(mappedData(sampleSpotlightData[0] || {}));
  }, [recipientId, regionId]);

  const hasIndicators = spotlightData.some((indicator) => indicator.value === true);

  const numberOfTrueIndicators = spotlightData
    .filter((indicator) => indicator.value === true)
    .length;

  return (
    <Container paddingX={0} paddingY={0} className="ttahub--recipient-summary">
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Recipient spotlight</h2>
        <p className="margin-0 padding-0 usa-prose">This is the recipient&apos;s current number of priority indicators.</p>
      </div>

      {hasResults ? (
        <div className="ttahub-recipient-spotlight-content padding-3 overflow-y-auto">
          <div className="display-flex flex-align-center">
            <div className="display-flex flex-column">
              <div className="display-flex flex-align-center">
                {hasIndicators
                  ? <FontAwesomeIcon className="margin-right-1" color={colors.error} icon={faCircleExclamation} style={{ fontSize: '20px' }} />
                  : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="margin-right-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M19.375 8.04688C19.7917 8.61979 20 9.27083 20 10C20 10.7292 19.7917 11.3932 19.375 11.9922C18.9583 12.5651 18.4245 12.9688 17.7734 13.2031C18.0599 13.8281 18.138 14.5052 18.0078 15.2344C17.9036 15.9375 17.5911 16.5495 17.0703 17.0703C16.5495 17.5911 15.9375 17.9036 15.2344 18.0078C14.5312 18.138 13.8542 18.0599 13.2031 17.7734C13.0469 18.2161 12.8125 18.5938 12.5 18.9062C12.1875 19.2448 11.8099 19.5052 11.3672 19.6875C10.9505 19.8958 10.4948 20 10 20C9.27083 20 8.60677 19.7917 8.00781 19.375C7.4349 18.9583 7.03125 18.4245 6.79688 17.7734C6.14583 18.0599 5.46875 18.138 4.76562 18.0078C4.0625 17.9036 3.45052 17.5911 2.92969 17.0703C2.40885 16.5495 2.08333 15.9375 1.95312 15.2344C1.84896 14.5052 1.9401 13.8281 2.22656 13.2031C1.57552 12.9688 1.04167 12.5651 0.625 11.9922C0.208333 11.3932 0 10.7292 0 10C0 9.27083 0.208333 8.61979 0.625 8.04688C1.04167 7.44792 1.57552 7.03125 2.22656 6.79688C1.9401 6.17188 1.84896 5.50781 1.95312 4.80469C2.08333 4.07552 2.40885 3.45052 2.92969 2.92969C3.45052 2.40885 4.0625 2.09635 4.76562 1.99219C5.49479 1.86198 6.17188 1.9401 6.79688 2.22656C7.03125 1.57552 7.4349 1.04167 8.00781 0.625C8.60677 0.208333 9.27083 0 10 0C10.7292 0 11.3802 0.208333 11.9531 0.625C12.5521 1.04167 12.9688 1.57552 13.2031 2.22656C13.8281 1.9401 14.4922 1.86198 15.1953 1.99219C15.9245 2.09635 16.5495 2.40885 17.0703 2.92969C17.5911 3.45052 17.9036 4.07552 18.0078 4.80469C18.138 5.50781 18.0599 6.17188 17.7734 6.79688C18.4245 7.03125 18.9583 7.44792 19.375 8.04688ZM14.3359 8.28125C14.5443 8.07292 14.5443 7.86458 14.3359 7.65625L13.3203 6.64062C13.138 6.43229 12.9427 6.43229 12.7344 6.64062L8.94531 10.4297L7.30469 8.75C7.09635 8.54167 6.88802 8.54167 6.67969 8.75L5.66406 9.76562C5.45573 9.97396 5.45573 10.1693 5.66406 10.3516L8.63281 13.3594C8.8151 13.5417 9.01042 13.5417 9.21875 13.3594L14.3359 8.28125Z" fill="#00A91C" />
                    </svg>
                  )}
                <h3 className="margin-0 font-serif-md">{hasIndicators ? 'Recipient may need prioritized attention' : 'No priority indicators identified'}</h3>
              </div>
              <IndicatorCounter count={numberOfTrueIndicators} totalCount={7} />
            </div>
          </div>

          <div className="display-flex flex-align-center margin-top-1">
            <div className="flex-row">
              <b><p className="usa-prose margin-0 margin-bottom-2">{`${numberOfTrueIndicators} of 7 priority indicators`}</p></b>
              <div>
                {
                spotlightData.map((indicator) => (
                  <div key={indicator.name} aria-hidden={!indicator.value} className={`ttahub-recipient-spotlight-content-cell ttahub-recipient-spotlight-content-cell${indicator.value ? '-bad-indicator' : '-good-indicator'} radius-md width-full display-flex flex-align-center margin-bottom-1 padding-x-2 padding-y-1`}>
                    <div className="display-flex flex-column">
                      <b><span className="usa-prose">{indicator.label}</span></b>
                      <p className="usa-prose margin-y-0 text-wrap">{indicator.description}</p>
                    </div>
                  </div>
                ))
              }
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ttahub-recipient-spotlight-content padding-3 overflow-y-auto">
          <NoResultsFound customMessage="There are no current priority indicators for this recipient." hideFilterHelp />
        </div>
      )}
    </Container>
  );
}

RecipientSpotlight.propTypes = {
  regionId: PropTypes.number.isRequired,
  recipientId: PropTypes.number.isRequired,
};
