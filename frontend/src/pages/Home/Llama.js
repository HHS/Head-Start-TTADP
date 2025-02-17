import React, {
  useEffect, useState,
} from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import PropTypes from 'prop-types';
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
import celebratoryLlama from './heart-logo.jpg';
import colors from '../../colors';
import Loader from '../../components/Loader';
import './Llama.css';

export default function Llama({ user }) {
  const [loading, setLoading] = useState(true);
  const userCanWrite = user.permissions.some((permission) => (
    permission.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS)
    || permission.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS);

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
      }
    }

    fetchStatistics();
  }, [user.id]);

  const bannerMessage = userCanWrite ? 'To celebrate, let\'s look back on all the work you\'ve done:' : 'To celebrate, let\'s look back on all the work we\'ve done:';
  const statisticsContentClasses = ['statistics-content', 'position-relative'];

  if (!loading) {
    statisticsContentClasses.push('statistics-content--loaded');
  }

  return (
    <Container>
      <div className="position-relative bg-white margin-auto">
        <Loader loadingLabel="Crunching some numbers and loading your statistics..." loading={loading} />
        <div className={statisticsContentClasses.join(' ')}>
          <h2 className="margin-0">
            <span aria-hidden="true">🎉</span>
            The TTA Hub is three years old!
            <span aria-hidden="true">🎉</span>
          </h2>
          <p className="usa-prose">{bannerMessage}</p>
          <div className="statistics-content-heart-logo">
            <img
              src={celebratoryLlama}
              alt="You've done a great job on the ttahub!"
            />
          </div>
          {userCanWrite ? (
            <>
              <div className="statistics-content--two-fer">
                <Field
                  label="since you joined"
                  data={`${statistics.daysSinceJoined} days`}
                  icon={faCalendarAlt}
                  iconColor={colors.ttahubMagenta}
                  backgroundColor={colors.ttahubMagentaLight}
                />
              </div>

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
            </>
          ) : null }

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
