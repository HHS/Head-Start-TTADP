import React, { useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  format, parse, parseISO, isValid,
} from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Button,
  ModalToggleButton,
} from '@trussworks/react-uswds';
import { deleteGroup, fetchGroups } from '../../../fetchers/groups';
import VanillaModal from '../../../components/VanillaModal';
import AppLoadingContext from '../../../AppLoadingContext';
import './MyGroup.scss';

export default function MyGroup({
  group, setMyGroups, setError, isViewOnly, isCoOwner,
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

  const determineGroupAccess = () => {
    let access = group.isPublic ? 'Public' : 'Private';
    if (isCoOwner && group.individuals.length) {
      if (group.individuals.length) {
        access = 'Individuals';
      }
    }

    return access;
  };

  const getLastUpdated = () => {
    const isoDatePrefix = typeof group.updatedAt === 'string' ? group.updatedAt.slice(0, 10) : '';
    const parsedIsoDatePrefix = parse(isoDatePrefix, 'yyyy-MM-dd', new Date());
    const parsedIsoDate = parseISO(group.updatedAt);
    const parsedLegacyDate = parse(group.updatedAt, 'yyyy/MM/dd', new Date());
    let parsedDate = null;

    if (isValid(parsedIsoDatePrefix)) {
      parsedDate = parsedIsoDatePrefix;
    } else if (isValid(parsedIsoDate)) {
      parsedDate = parsedIsoDate;
    } else if (isValid(parsedLegacyDate)) {
      parsedDate = parsedLegacyDate;
    }

    let updatedAt = parsedDate ? format(parsedDate, 'MM/dd/yyyy') : '';
    if (group.editor) {
      updatedAt = `${updatedAt} by ${group.editor.name}`;
    }
    return updatedAt;
  };

  return (
    <tr key={group.id}>
      <td data-label="Group name">
        {group.name}
      </td>
      <td data-label="Owner">
        {group.creator.name}
      </td>
      <td data-label="Access">
        {determineGroupAccess()}
      </td>
      <td data-label="Last update">
        {getLastUpdated()}
      </td>
      <td className={isViewOnly ? 'smart-hub--groups-view' : 'smart-hub--groups-edit-delete'} align="right">
        {
          isViewOnly
            ? <Link to={`/account/group/${group.id}`} aria-label={`view ${group.name}`} className="usa-button usa-button--unstyled">View group</Link>
            : (
              <>
                <Link disabled={isAppLoading} to={`/account/my-groups/${group.id}`} aria-label={`edit ${group.name}`} className="usa-button usa-button--unstyled desktop:margin-right-3">Edit group</Link>
                <ModalToggleButton disabled={isAppLoading} opener aria-label={`delete ${group.name}`} modalRef={modalRef} unstyled>Delete group</ModalToggleButton>
              </>
            )
        }

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
    updatedAt: PropTypes.string.isRequired,
    creator: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    editor: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    individuals: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired),
  }).isRequired,
  setMyGroups: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  isViewOnly: PropTypes.bool,
  isCoOwner: PropTypes.bool,
};

MyGroup.defaultProps = {
  isViewOnly: false,
  isCoOwner: false,
};
