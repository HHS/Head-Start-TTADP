import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { GridContainer, Grid } from '@trussworks/react-uswds';
import {
  faClock,
  faCalendarAlt,
  faClipboardUser,
  faUserFriends,
  faBuilding,
  faChartColumn,
  faCheck,
  faGear,
} from '@fortawesome/free-solid-svg-icons';
import Container from '../../components/Container';
import { Field } from '../../widgets/DashboardOverview';
import { getStatistics } from '../../fetchers/users';

import './Llama.css';
import celebratoryLlama from './celebratory-llama.png';
import colors from '../../colors';

export default function Llama({ user }) {
  const [statistics, setStatistics] = useState({
    daysSinceJoined: '0 days',
    arsCreated: 0,
    arsCollaboratedOn: 0,
    ttaProvided: '0 days',
    recipientsReached: 0,
    grantsServed: 0,
    participantsReached: 0,
    goalsApproved: 0,
    objectivesApproved: 0,
  });

  useEffect(() => {
    async function fetchStatistics() {
      try {
        const stats = await getStatistics(user.id);
        setStatistics(stats);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    fetchStatistics();
  }, [user.id]);

  return (
    <Container>
      <div className="position-relative bg-white margin-auto">
        <img
          className="celebratory-llama display-none bottom-0"
          src={celebratoryLlama}
          height="330"
          alt="hey folks, it's me, llawrence the llama, and I'm just here to tell you that you've done a great job here on the ttahub"
        />

        <div className="statistics-content position-relative">
          <h2 className="width-tablet-lg margin-x-auto">The TTA hub is two years old!</h2>
          <p className="usa-prose width-tablet-lg margin-x-auto">To celebrate, let&apos;s look back on all the work you&apos;ve done:</p>

          <GridContainer containerSize="tablet-lg" className="desktop:bg-base-lighter padding-2">
            <Grid row gap={1} className="margin-bottom-2">
              <Field
                label="since you joined"
                data={statistics.daysSinceJoined}
                icon={faCalendarAlt}
                iconColor={colors.ttahubMagenta}
                backgroundColor={colors.ttahubMagentaLight}
              />
              <Field
                label="ARs created"
                data={statistics.arsCreated}
                icon={faClipboardUser}
                iconColor={colors.ttahubMediumBlue}
                backgroundColor={colors.ttahubBlueLight}
              />
              <Field
                label="ARs collaborated on"
                data={statistics.arsCollaboratedOn}
                icon={faUserFriends}
                iconColor={colors.success}
                backgroundColor={colors.successLighter}
              />
            </Grid>
            <Grid row gap={1} className="margin-bottom-2">
              <Field
                label="of TTA provided"
                data={statistics.ttaProvided}
                icon={faClock}
                iconColor={colors.ttahubOrange}
                backgroundColor={colors.ttahubOrangeLight}
              />
              <Field
                label="recipients reached"
                data={statistics.recipientsReached}
                icon={faChartColumn}
                iconColor={colors.ttahubMagenta}
                backgroundColor={colors.ttahubMagentaLight}
              />
              <Field
                label="grants served"
                data={statistics.grantsServed}
                icon={faBuilding}
                iconColor={colors.success}
                backgroundColor={colors.successLighter}
              />
            </Grid>
            <Grid row gap={1}>
              <Field
                label="participants reached"
                data={statistics.participantsReached}
                icon={faUserFriends}
                iconColor={colors.ttahubBlue}
                backgroundColor={colors.ttahubBlueLighter}
              />
              <Field
                label="goals approved"
                data={statistics.goalsApproved}
                icon={faCheck}
                iconColor={colors.ttahubOrange}
                backgroundColor={colors.ttahubOrangeLight}
              />
              <Field
                label="objectives approved"
                data={statistics.objectivesApproved}
                icon={faGear}
                iconColor={colors.ttahubOrange}
                backgroundColor={colors.ttahubOrangeLight}
              />
            </Grid>
          </GridContainer>
        </div>
      </div>
    </Container>
  );
}

Llama.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
  }).isRequired,
};
