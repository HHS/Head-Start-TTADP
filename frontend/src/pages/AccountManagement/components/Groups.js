import React, {
  useState,
  useContext,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Table,
} from '@trussworks/react-uswds';
import UserContext from '../../../UserContext';
import MyGroup from './MyGroup';
import WidgetCard from '../../../components/WidgetCard';
import { MyGroupsContext } from '../../../components/MyGroupsProvider';

export default function Groups() {
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);
  const { myGroups, setMyGroups } = useContext(MyGroupsContext);

  const getGroupBuckets = () => {
    // Get creator bucket.
    const creatorGroups = (myGroups || []).filter((group) => group.creator.id === user.id);

    // Get Co-owned bucket.
    const coOwnedGroups = (myGroups || []).filter((group) => {
      const found = group.groupCollaborators.filter((collaborator) => collaborator.collaboratorType.name === 'Co-Owner' && collaborator.user.id === user.id);
      return found.length > 0;
    });

    // Get shared bucket.
    const sharedGroups = (myGroups || []).filter((group) => {
      const found = group.groupCollaborators.filter((collaborator) => collaborator.collaboratorType.name === 'SharedWith' && collaborator.user.id === user.id);
      return found.length > 0;
    });

    // Get group ids for co-owned and shared groups.
    const cowOwnerGroupIds = coOwnedGroups.map((group) => group.id);
    const sharedGroupIds = sharedGroups.map((group) => group.id);

    // Get public groups.
    const publicGroups = (myGroups || []).filter((group) => group.creator.id !== user.id
    && !cowOwnerGroupIds.includes(group)
    && !sharedGroupIds.includes(group));

    // Combine and sort shared and public groups.
    const sharedWithMe = sharedGroups.concat(publicGroups).sort(
      (a, b) => a.name.localeCompare(b.name),
    );

    return {
      creatorGroups,
      coOwnedGroups,
      sharedWithMe,
    };
  };
  const groups = getGroupBuckets();
  return (
    <WidgetCard
      header={(
        <div className="display-flex flex-align-center margin-top-2">
          <h2 className="margin-bottom-1 margin-top-0 font-sans-xl">My groups</h2>
          <Link to="/account/my-groups" className="usa-button text-white text-no-underline margin-left-2">Create a group</Link>
        </div>
      )}
    >
      <div className="margin-bottom-3 maxw-tablet-lg">
        { error ? <Alert type="error" role="alert">{error}</Alert> : null }
        <h3>Created by me</h3>
        {!groups || !groups.creatorGroups.length ? <p className="usa-prose">You haven&apos;t created any groups yet</p> : (
          <Table fullWidth stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Group name</th>
                <th scope="col">Owner</th>
                <th scope="col">Access</th>
                <th scope="col">Last update</th>
                <th scope="col"><span className="usa-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.creatorGroups.map((group) => (
                <MyGroup
                  key={group.id}
                  group={group}
                  setMyGroups={setMyGroups}
                  setError={setError}
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="margin-bottom-3 maxw-tablet-lg">
        <h3>Co-owned by me</h3>
        {!groups || !groups.coOwnedGroups.length ? <p className="usa-prose">You haven&apos;t been added as a co-owner yet</p> : (
          <Table fullWidth stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Group name</th>
                <th scope="col">Owner</th>
                <th scope="col">Access</th>
                <th scope="col">Last update</th>
                <th scope="col"><span className="usa-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.coOwnedGroups.map((group) => (
                <MyGroup
                  key={group.id}
                  group={group}
                  setMyGroups={setMyGroups}
                  setError={setError}
                  isCoOwner
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="margin-bottom-3 maxw-tablet-lg">
        <h3>Shared with me</h3>
        {!groups || !groups.sharedWithMe.length ? <p className="usa-prose">You don&apos;t have any shared groups yet</p> : (
          <Table fullWidth stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Group name</th>
                <th scope="col">Owner</th>
                <th scope="col">Access</th>
                <th scope="col">Last update</th>
                <th scope="col"><span className="usa-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.sharedWithMe.map((group) => (
                <MyGroup
                  key={group.id}
                  group={group}
                  setMyGroups={setMyGroups}
                  setError={setError}
                  isViewOnly
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </WidgetCard>
  );
}
