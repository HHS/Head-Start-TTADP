import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Button,
  ModalToggleButton,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { deleteGroup } from '../../../fetchers/groups';
import VanillaModal from '../../../components/VanillaModal';

export default function MyGroup({
  group, setGroups, groups, setError,
}) {
  const modalRef = useRef();

  const onDelete = async (groupId) => {
    try {
      await deleteGroup(groupId);
      setGroups({
        myGroups: groups.myGroups.filter((g) => g.id !== groupId),
        publicGroups: groups.publicGroups.filter((g) => g.id !== groupId),
      });
    } catch (err) {
      setError('There was an error deleting your group');
    }
  };

  return (
    <tr key={group.id}>
      <td>
        {group.name}
      </td>
      <td>
        {!group.isPublic ? <FontAwesomeIcon className="margin-right-1" icon={faLock} /> : <FontAwesomeIcon className="margin-right-1" icon={faUserFriends} />}
        {group.isPublic ? 'Public' : 'Private'}
      </td>
      <td align="right">
        <Link to={`/account/my-groups/${group.id}`} aria-label={`edit ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">Edit group</Link>
        <ModalToggleButton opener aria-label={`delete ${group.name}`} modalRef={modalRef} unstyled>Delete group</ModalToggleButton>
        <VanillaModal modalRef={modalRef} heading="Are you sure you want to continue?">
          <div>
            <p className="usa-prose">
              Your group will be permanently removed.
            </p>
            <ModalToggleButton closer modalRef={modalRef} data-focus="true" className="margin-right-1">Cancel</ModalToggleButton>
            <Button
              type="button"
              unstyled
              onClick={async () => {
                await onDelete(group.id);
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
  setGroups: PropTypes.func.isRequired,
  groups: PropTypes.shape({
    myGroups: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      isPublic: PropTypes.bool.isRequired,
    })).isRequired,
    publicGroups: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      isPublic: PropTypes.bool.isRequired,
    })).isRequired,
  }).isRequired,
  setError: PropTypes.func.isRequired,
};
