import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Table } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { fetchGroups, deleteGroup } from '../../../fetchers/groups';
import UserContext from '../../../UserContext';

export default function Groups() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);

  const onDelete = async (groupId) => {
    try {
      await deleteGroup(groupId);
      setGroups({
        myGroups: groups.myGroups.filter((group) => group.id !== groupId),
        publicGroups: groups.publicGroups.filter((group) => group.id !== groupId),
      });
    } catch (err) {
      setError('There was an error deleting your group');
    }
  };

  useEffect(() => {
    async function getGroups() {
      try {
        const response = await fetchGroups();
        setGroups({
          myGroups: response.filter((group) => group.userId === user.id),
          publicGroups: response.filter((group) => group.userId !== user.id),
        });
      } catch (err) {
        setGroups({ myGroups: [], publicGroups: [] });
      }
    }

    if (!groups) {
      getGroups();
    }
  }, [groups, user.id]);

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
                <tr key={group.id}>
                  <td>
                    {group.name}
                  </td>
                  <td>
                    {!group.isPublic ? <FontAwesomeIcon className="margin-right-1" icon={faLock} /> : null}
                    {group.isPublic ? 'Public' : 'Private'}
                  </td>
                  <td align="right">
                    <Link to={`/account/my-groups/${group.id}`} aria-label={`edit ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">Edit group</Link>
                    <Button type="button" aria-label={`delete ${group.name}`} onClick={() => onDelete(group.id)} unstyled>Delete group</Button>
                  </td>
                </tr>
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
            {groups.publicGroups.map((group) => (
              <tbody>
                <tr key={group.id}>
                  <td>
                    {group.name}
                  </td>
                  <td>
                    {group.isPublic
                      ? <FontAwesomeIcon className="margin-right-1" icon={faUserFriends} />
                      : <FontAwesomeIcon className="margin-right-1" icon={faLock} />}
                    {group.isPublic ? 'Public' : 'Private'}
                  </td>
                  <td align="right">
                    <Link to={`/account/group/${group.id}`} aria-label={`view ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">View</Link>
                  </td>
                </tr>
              </tbody>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
