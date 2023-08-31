import React, { useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Button,
  ModalToggleButton,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { deleteGroup, fetchGroups } from '../../../fetchers/groups';
import VanillaModal from '../../../components/VanillaModal';
import AppLoadingContext from '../../../AppLoadingContext';

export default function MyGroup({
  group, setMyGroups, setError,
}) {
  const modalRef = useRef();

  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);

  const onDelete = async (groupId) => {
    try {
      await deleteGroup(groupId);
    } finally {
      // Regardless, get the updated list of groups.
      const updatedGroups = await fetchGroups();
      setMyGroups(updatedGroups);
    }
  };

  return (
    <tr key={group.id}>
      <td data-label="Group name">
        {group.name}
      </td>
      <td data-label="Group access">
        {!group.isPublic ? <FontAwesomeIcon className="margin-right-1" icon={faLock} /> : <FontAwesomeIcon className="margin-right-1" icon={faUserFriends} />}
        {group.isPublic ? 'Public' : 'Private'}
      </td>
      <td align="right">
        <Link disabled={isAppLoading} to={`/account/my-groups/${group.id}`} aria-label={`edit ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">Edit group</Link>
        <ModalToggleButton disabled={isAppLoading} opener aria-label={`delete ${group.name}`} modalRef={modalRef} unstyled>Delete group</ModalToggleButton>
        <VanillaModal modalRef={modalRef} heading="Are you sure you want to continue?">
          <div>
            <p className="usa-prose">
              Your group will be permanently removed.
            </p>
            <ModalToggleButton closer modalRef={modalRef} data-focus="true" className="margin-right-1">Cancel</ModalToggleButton>
            <Button
              type="button"
              className="usa-button--subtle"
              disabled={isAppLoading}
              onClick={async () => {
                setIsAppLoading(true);
                try {
                  await onDelete(group.id);
                } catch (err) {
                  setError('There was an error deleting your group');
                } finally {
                  setIsAppLoading(false);
                }
              }}
            >
              Continue
            </Button>
          </div>
        </VanillaModal>
      </td>
    </tr>
  );
}

MyGroup.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    isPublic: PropTypes.bool.isRequired,
  }).isRequired,
  setMyGroups: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
};
