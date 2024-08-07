import React, { useEffect, useState, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import colors from '../../colors';
import { fetchGroup } from '../../fetchers/groups';
import AppLoadingContext from '../../AppLoadingContext';
import WidgetCard from '../../components/WidgetCard';
import ReadOnlyField from '../../components/ReadOnlyField';
import SomethingWentWrongContext from '../../SomethingWentWrongContext';

export default function Group() {
  const { groupId } = useParams();

  const [group, setGroup] = useState({
    name: '',
    grants: [],
  });

  const { setIsAppLoading } = useContext(AppLoadingContext);
  const { setErrorResponseCode } = useContext(SomethingWentWrongContext);

  useEffect(() => {
    async function getGroup() {
      setIsAppLoading(true);
      try {
        const existingGroupData = await fetchGroup(groupId);
        setGroup(existingGroupData);
      } catch (err) {
        setErrorResponseCode(err.status);
      } finally {
        setIsAppLoading(false);
      }
    }

    // load existing group data from API based on query param
    if (groupId) {
      getGroup();
    }
  }, [groupId, setIsAppLoading, setErrorResponseCode]);

  if (!group) {
    return null;
  }

  const getGrantList = () => {
    // Sort group.grants by grant.recipient.name
    group.grants.sort((a, b) => a.recipient.name.localeCompare(b.recipient.name));

    // Loop all grants and return a <li> for each grant
    return group.grants.map((grant) => (
      <li key={grant.id}>
        {grant.recipientNameWithPrograms}
      </li>
    ));
  };

  const mapUsers = (usersToMap) => {
    if (!usersToMap || !usersToMap.length) {
      return null;
    }
    return usersToMap.map((user) => (
      <li key={user.id}>
        {user.name}
      </li>
    ));
  };

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
        <ReadOnlyField label="Group owner">
          {group && group.creator ? group.creator.name : ''}
        </ReadOnlyField>
        <ReadOnlyField label="Recipients">
          <ul className="usa-list usa-list--unstyled">
            {getGrantList()}
          </ul>
        </ReadOnlyField>
        <ReadOnlyField label="Co-owners">
          <ul className="usa-list usa-list--unstyled">
            {mapUsers(group.coOwners)}
          </ul>
        </ReadOnlyField>
        <ReadOnlyField label="Shared with">
          <ul className="usa-list usa-list--unstyled">
            {mapUsers(group.individuals)}
          </ul>
        </ReadOnlyField>
      </WidgetCard>
    </>
  );
}
