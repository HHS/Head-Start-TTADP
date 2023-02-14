import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import { fetchGroups, deleteGroup } from '../../../fetchers/groups';

export default function Groups() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);

  const onDelete = async (groupId) => {
    try {
      await deleteGroup(groupId);
      setGroups(groups.filter((group) => group.id !== groupId));
    } catch (err) {
      setError('There was an error deleting your group');
    }
  };

  useEffect(() => {
    async function getGroups() {
      try {
        const response = await fetchGroups();
        setGroups(response);
      } catch (err) {
        setGroups([]);
      }
    }

    if (!groups) {
      getGroups();
    }
  }, [groups]);

  return (
    <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
      <h2 className="margin-bottom-1 font-sans-xl">My groups</h2>
      { error ? <Alert type="error" role="alert">{error}</Alert> : null }
      <div className="margin-bottom-3">
        {!groups || !groups.length ? <p className="usa-prose">You have no groups.</p> : (
          <ul className="usa-list usa-list--unstyled maxw-tablet margin-bottom-3">
            {groups.map((group) => (
              <li key={group.id} className="margin-bottom-3 desktop:display-flex border-bottom border-gray-5 flex-justify padding-2">
                <span>
                  {group.name}
                </span>
                <span>
                  <Link to={`/account/my-groups/${group.id}`} className="usa-button usa-button--unstyled desktop:margin-right-3">Edit group</Link>
                  <Button type="button" onClick={() => onDelete(group.id)} unstyled>Delete group</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="margin-bottom-3">
        <Link to="/account/my-groups" className="usa-button text-white text-no-underline">Create group</Link>
      </div>
    </div>
  );
}
