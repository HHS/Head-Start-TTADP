import React, { useEffect, useState, useContext } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@trussworks/react-uswds';
import colors from '../../colors';
import { fetchGroup } from '../../fetchers/groups';
import AppLoadingContext from '../../AppLoadingContext';
import WidgetCard from '../../components/WidgetCard';

export default function Group({ match }) {
  const { groupId } = match.params;
  const [error, setError] = useState(null);

  const [group, setGroup] = useState({
    name: '',
    grants: [],
  });

  const { setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function getGroup() {
      setIsAppLoading(true);
      try {
        const existingGroupData = await fetchGroup(groupId);
        if (existingGroupData) {
          setGroup(existingGroupData);
        }
      } catch (err) {
        setError('There was an error fetching your group');
      } finally {
        setIsAppLoading(false);
      }
    }

    // load existing group data from API based on query param
    if (groupId) {
      getGroup();
    }
  }, [groupId, setIsAppLoading]);

  return (
    <>
      <Helmet>
        <title>
          Group
          {' '}
          {group.name}
        </title>
      </Helmet>
      <Link className="margin-top-0 margin-bottom-3 display-inline-block" to="/account">
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        Back to Account Management
      </Link>

      <WidgetCard
        header={<h1 className="margin-top-2 margin-bottom-4 font-serif-xl">{group.name}</h1>}
      >
        {error ? (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        ) : null}

        <ul className="usa-list usa-list--unstyled">
          {group.grants.map((grant) => (
            <li key={grant.id}>
              {grant.name}
            </li>
          ))}
        </ul>
      </WidgetCard>
    </>
  );
}

Group.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
