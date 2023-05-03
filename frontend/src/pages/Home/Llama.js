/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, {
  useEffect, useState, useMemo, useRef,
} from 'react';
import { SCOPE_IDS } from '@ttahub/common';
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
import Loader from '../../components/Loader';

export default function Llama({ user }) {
  const [loading, setLoading] = useState(true);
  const userCanWrite = useMemo(() => user.permissions.some((permission) => (
    permission.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS)
    || permission.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS), [user.permissions]);

  const [statistics, setStatistics] = useState({
    daysSinceJoined: 0,
    arsCreated: 0,
    arsCollaboratedOn: 0,
    ttaProvided: '0 days',
    recipientsReached: 0,
    grantsServed: 0,
    participantsReached: 0,
    goalsApproved: 0,
    objectivesApproved: 0,
  });

  const llamaImage = useRef(null);

  useEffect(() => {
    async function fetchStatistics() {
      try {
        const stats = await getStatistics(user.id);
        setStatistics(stats);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
        llamaImage.current.classList.add('celebratory-llama');
      }
    }

    fetchStatistics();
  }, [user.id]);

  const addWiggler = () => {
    if (llamaImage.current.classList.contains('the-wiggler')) return;
    llamaImage.current.classList.add('the-wiggler');
  };

  const bannerMessage = userCanWrite ? 'To celebrate, let\'s look back on all the work you\'ve done:' : 'To celebrate, let\'s look back on all the work we\'ve done:';

  return (
    <Container>
      <div className="position-relative bg-white margin-auto" onClick={addWiggler}>
        <Loader loadingLabel="Crunching some numbers..." loading={loading} />
        <img
          className="display-none bottom-0"
          src={celebratoryLlama}
          height="330"
          alt="hey folks, it's me, llawrence the llama, and I'm just here to tell you that you've done a great job here on the ttahub"
          ref={llamaImage}
        />

        <div className="statistics-content position-relative">
          <h2 className="width-tablet-lg margin-x-auto">The TTA hub is two years old!</h2>
          <p className="usa-prose width-tablet-lg margin-x-auto">{bannerMessage}</p>

          <GridContainer containerSize="tablet-lg" className="desktop:bg-base-lighter padding-2">
            {userCanWrite ? (
              <Grid row gap={1} className="margin-bottom-2">
                <Field
                  label="since you joined"
                  data={`${statistics.daysSinceJoined} days`}
                  icon={faCalendarAlt}
                  iconColor={colors.ttahubMagenta}
                  backgroundColor={colors.ttahubMagentaLight}
                />
                <Field
                  label="ARs created"
                  data={String(statistics.arsCreated)}
                  icon={faClipboardUser}
                  iconColor={colors.ttahubMediumBlue}
                  backgroundColor={colors.ttahubBlueLight}
                />
                <Field
                  label="ARs collaborated on"
                  data={String(statistics.arsCollaboratedOn)}
                  icon={faUserFriends}
                  iconColor={colors.ttahubMediumDeepTeal}
                  backgroundColor={colors.ttahubDeepTealLight}
                />
              </Grid>
            ) : null }
            <Grid row gap={1} className="margin-bottom-2">
              <Field
                label="of TTA provided"
                data={String(statistics.ttaProvided)}
                icon={faClock}
                iconColor={colors.ttahubOrange}
                backgroundColor={colors.ttahubOrangeLight}
              />
              <Field
                label="recipients reached"
                data={String(statistics.recipientsReached)}
                icon={faChartColumn}
                iconColor={colors.ttahubMagenta}
                backgroundColor={colors.ttahubMagentaLight}
              />
              <Field
                label="grants served"
                data={String(statistics.grantsServed)}
                icon={faBuilding}
                iconColor={colors.ttahubMediumDeepTeal}
                backgroundColor={colors.ttahubDeepTealLight}
              />
            </Grid>
            <Grid row gap={1}>
              <Field
                label="participants reached"
                data={String(statistics.participantsReached)}
                icon={faUserFriends}
                iconColor={colors.ttahubBlue}
                backgroundColor={colors.ttahubBlueLighter}
              />
              <Field
                label="goals approved"
                data={String(statistics.goalsApproved)}
                icon={faCheck}
                iconColor={colors.ttahubOrange}
                backgroundColor={colors.ttahubOrangeLight}
              />
              <Field
                label="objectives approved"
                data={String(statistics.objectivesApproved)}
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
    permissions: PropTypes.arrayOf(PropTypes.shape({
      scopeId: PropTypes.number,
    })),
  }).isRequired,
};
