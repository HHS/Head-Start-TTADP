import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faCircleExclamation, faCheck, faX,
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
                  ? <FontAwesomeIcon className="margin-right-1" size="2x" color={colors.error} icon={faCircleExclamation} />
                  : <FontAwesomeIcon className="margin-right-1" size="2x" color={colors.success} icon={faCircleCheck} />}
                <h3 className="margin-0 Merriweather">{hasIndicators ? 'Recipient may need prioritized attention' : 'No priority indicators identified'}</h3>
              </div>
              <IndicatorCounter count={numberOfTrueIndicators} totalCount={7} />
            </div>
          </div>

          <div className="display-flex flex-align  <div key={indicator.name} className={`ttahub-recipient-spotlight-content-cell ttahub-recipient-spotlight-content-cell${indicator.value ? '-bad-indicator' :n-center margin-top-1">
            <div className="flex-row">
              <b><p className="usa-prose margin-0 margin-bottom-2">{`${numberOfTrueIndicators} of 7 priority indicators`}</p></b>
              <div>
                {
                spotlightData.map((indicator) => (
                  <div key={indicator.name} aria-hidden={indicator.value} className={`ttahub-recipient-spotlight-content-cell ttahub-recipient-spotlight-content-cell${indicator.value ? '-bad-indicator' : '-good-indicator'} radius-md width-full display-flex flex-align-center margin-bottom-1 padding-x-2 padding-y-1`}>
                    {indicator.value
                      ? <FontAwesomeIcon className="margin-right-2" size="1.5x" color={colors.baseMedium} icon={faX} />
                      : <FontAwesomeIcon className="margin-right-2" size="1.5x" color={colors.ttahubMediumBlue} icon={faCheck} />}
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
          <NoResultsFound />
        </div>
      )}
    </Container>
  );
}

RecipientSpotlight.propTypes = {
  regionId: PropTypes.number.isRequired,
  recipientId: PropTypes.number.isRequired,
};
