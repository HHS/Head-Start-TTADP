import React, {
  useState,
  useEffect,
  useContext,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Table,
} from '@trussworks/react-uswds';
import { fetchGroups } from '../../../fetchers/groups';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import MyGroup from './MyGroup';

export default function Groups() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);
  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function getGroups() {
      setIsAppLoading(true);
      try {
        const response = await fetchGroups();
        setGroups({
          myGroups: response.filter((group) => group.userId === user.id),
          publicGroups: response.filter((group) => group.userId !== user.id),
        });
      } catch (err) {
        setGroups({ myGroups: [], publicGroups: [] });
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!groups && !isAppLoading && user.id) {
      getGroups();
    }
  }, [groups, isAppLoading, setIsAppLoading, user.id]);

  return (
    <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
      <div className="display-flex flex-align-center">
        <h2 className="margin-y-0 margin-right-2 font-sans-xl">My groups</h2>
        <Link to="/account/my-groups" className="usa-button text-white text-no-underline">Create a group</Link>
      </div>
      { error ? <Alert type="error" role="alert">{error}</Alert> : null }
      <div className="margin-bottom-3 maxw-tablet-lg">
        <h3>Created by me</h3>
        {!groups || !groups.myGroups.length ? <p className="usa-prose">You haven&apos;t created any groups yet</p> : (
          <Table fullWidth>
            <thead>
              <tr>
                <th scope="col">Group name</th>
                <th scope="col">Group access</th>
                <th scope="col"><span className="usa-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.myGroups.map((group) => (
                <MyGroup
                  key={group.id}
                  group={group}
                  setGroups={setGroups}
                  groups={groups}
                  setError={setError}
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="margin-bottom-3 maxw-tablet-lg">
        <h3>Created by others (public)</h3>
        {!groups || !groups.publicGroups.length ? <p className="usa-prose">No one has made any groups in your region public yet</p> : (
          <Table fullWidth>
            <thead>
              <tr>
                <th scope="col">Group name</th>
                <th scope="col">Group owner</th>
                <th scope="col"><span className="usa-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.publicGroups.map((group) => (
                <tr key={group.id}>
                  <td>
                    {group.name}
                  </td>
                  <td>
                    {group.user.name}
                  </td>
                  <td align="right">
                    <Link disabled={isAppLoading} to={`/account/group/${group.id}`} aria-label={`view ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
