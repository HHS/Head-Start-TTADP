import React, {
  useState,
  useEffect,
  useContext,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Table,
  Pagination,
} from '@trussworks/react-uswds';
import UserContext from '../../../UserContext';
import MyGroup from './MyGroup';
import WidgetCard from '../../../components/WidgetCard';
import { MyGroupsContext } from '../../../components/MyGroupsProvider';

const GROUPS_PER_PAGE = 10;

export default function Groups() {
  const [currentPage, setCurrentPage] = useState(1);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);
  const { myGroups, setMyGroups } = useContext(MyGroupsContext);
  console.log('my gorups', myGroups);
  const groups = {
    myGroups: (myGroups || []).filter((group) => group.creator.id === user.id),
    publicGroups: (myGroups || []).filter((group) => group.creator.id !== user.id),
  };

  const getPageInfo = () => {
    const from = offset >= groups.publicGroups.length ? 0 : offset + 1;
    const offsetTo = GROUPS_PER_PAGE * currentPage;
    let to;
    if (offsetTo > groups.publicGroups.length) {
      to = groups.publicGroups.length;
    } else {
      to = offsetTo;
    }

    return `${from}-${to} of ${groups.publicGroups.length}`;
  };

  const getTotalPages = () => {
    const totalPages = Math.floor(groups.publicGroups.length / GROUPS_PER_PAGE);
    return groups.publicGroups.length % GROUPS_PER_PAGE > 0 ? totalPages + 1 : totalPages;
  };

  useEffect(() => {
    setOffset(GROUPS_PER_PAGE * (currentPage - 1));
  }, [currentPage]);

  const showPaging = groups && groups.publicGroups.length > GROUPS_PER_PAGE;

  let groupsForDisplay = [];

  if (groups) {
    groupsForDisplay = groups.publicGroups;
  }

  if (showPaging) {
    groupsForDisplay = groupsForDisplay.slice(offset, offset + GROUPS_PER_PAGE);
  }

  return (
    <WidgetCard
      header={(
        <div className="display-flex flex-align-center margin-top-2">
          <h2 className="margin-bottom-1 margin-top-0 font-sans-xl">My groups</h2>
          <Link to="/account/my-groups" className="usa-button text-white text-no-underline margin-left-2">Create a group</Link>
        </div>
      )}
      footer={
      showPaging
        ? (
          <div className="display-flex flex-justify flex-align-center padding-x-2">
            <div>{getPageInfo()}</div>
            <Pagination
              className="margin-0"
              currentPage={currentPage}
              totalPages={getTotalPages()}
              onClickNext={() => setCurrentPage(currentPage + 1)}
              onClickPrevious={() => setCurrentPage(currentPage - 1)}
              onClickPageNumber={(_e, page) => setCurrentPage(page)}
            />
          </div>
        )
        : null
    }
    >
      <div className="margin-bottom-3 maxw-tablet-lg">
        { error ? <Alert type="error" role="alert">{error}</Alert> : null }
        <h3>Created by me</h3>
        {!groups || !groups.myGroups.length ? <p className="usa-prose">You haven&apos;t created any groups yet</p> : (
          <Table fullWidth stackedStyle="default">
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
                  setMyGroups={setMyGroups}
                  setError={setError}
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="margin-bottom-3 maxw-tablet-lg">
        <h3>Created by others (public)</h3>
        {!groups || !groups.publicGroups.length ? <p className="usa-prose">No one in your region has created a public group.</p> : (
          <>
            <Table fullWidth stackedStyle="default">
              <thead>
                <tr>
                  <th scope="col">Group name</th>
                  <th scope="col">Group owner</th>
                  <th scope="col"><span className="usa-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groupsForDisplay.map((group) => (
                  <tr key={group.id}>
                    <td data-label="Group name">
                      {group.name}
                    </td>
                    <td data-label="Group owner">
                      {group.creator ? group.creator.name : ''}
                    </td>
                    <td align="right">
                      <Link to={`/account/group/${group.id}`} aria-label={`view ${group.name}`} className="usa-button usa-button--unstyled">View group</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </div>
    </WidgetCard>
  );
}
