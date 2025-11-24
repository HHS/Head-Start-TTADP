import React, {
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import {
  Dropdown,
  Checkbox,
} from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import { getPossibleSessionParticipants, getGroupsForSession } from '../fetchers/session';
import FormItem from './FormItem';
import MultiSelect from './MultiSelect';
import GroupAlert from './GroupAlert';
import { parseCheckboxEvent } from '../Constants';
import QuestionTooltip from './QuestionTooltip';

const placeholderText = '- Select -';

const RecipientsWithGroups = ({
  regionId,
  showTooltip,
}) => {
  const {
    control,
    register,
    watch,
    setValue,
  } = useFormContext();

  const watchFormRecipients = watch('recipients');
  const watchGroup = watch('recipientGroup');

  const [recipientOptions, setRecipientOptions] = useState();

  useEffect(() => {
    async function fetchRecipients() {
      if (!recipientOptions && regionId) {
        const data = await getPossibleSessionParticipants(regionId);
        setRecipientOptions(data);
      }
    }
    fetchRecipients();
  }, [recipientOptions, regionId]);

  const options = (recipientOptions || []).map((recipient) => ({
    label: recipient.name,
    options: recipient.grants.map((grant) => ({
      value: grant.id,
      label: grant.name,
    })),
  }));

  // Groups.
  const [groups, setGroups] = useState([]);
  const [useGroups, setUseGroups] = useState(false);
  const [groupRecipientIds, setGroupRecipientIds] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [fetchedGroups, setFetchedGroups] = useState(false);
  useEffect(() => {
    async function fetchGroups() {
      if (regionId && !fetchedGroups) {
        setFetchedGroups(true);
        const retrievedGroups = await getGroupsForSession(regionId);

        // Add recipientIds to groups.
        const groupsWithRecipientIds = retrievedGroups.map((group) => ({
          ...group,
          // Match groups to grants as recipients could have multiple grants.
          recipients: group.grants.map((g) => g.id),
        }));
        setGroups(groupsWithRecipientIds);
      }
    }
    fetchGroups();
  }, [regionId, groups, fetchedGroups]);

  useDeepCompareEffect(() => {
    if (useGroups) {
      // Determine if there are any recipients that are not in the group.
      const usedRecipientIds = (watchFormRecipients || []).map((r) => r.value);
      const selectedRecipientsNotInGroup = usedRecipientIds.filter(
        (option) => !groupRecipientIds.includes(option),
      );

      // If the user changes recipients manually while using groups.
      if (watchGroup
      && (groupRecipientIds.length !== watchFormRecipients.length
        || selectedRecipientsNotInGroup.length > 0)) {
        setShowGroupInfo(true);
        setUseGroups(false);
        setValue('recipientGroup', null, { shouldValidate: false });
        setGroupRecipientIds([]);
      }
    }
  }, [groupRecipientIds, setValue, useGroups, watchFormRecipients, watchGroup]);

  const renderRecipients = () => (
    <div className="margin-top-2">
      <FormItem
        label="Recipients "
        name="recipients"
      >
        <MultiSelect
          name="recipients"
          control={control}
          simple={false}
          required="Select at least one recipient"
          options={options}
          placeholderText={placeholderText}
        />
      </FormItem>
    </div>
  );

  const resetGroup = (checkUseGroup = true) => {
    setValue('recipientGroup', null, { shouldValidate: false });
    setGroupRecipientIds([]);
    setValue('recipients', [], { shouldValidate: false });
    setShowGroupInfo(false);
    if (checkUseGroup) {
      setUseGroups(true);
    }
  };

  const toggleUseGroup = (event) => {
    const { checked } = parseCheckboxEvent(event);
    // Reset.
    resetGroup(false);
    setUseGroups(checked);
  };

  const handleGroupChange = (event) => {
    const { value: groupId } = event.target;
    const groupToUse = groups.find((group) => group.id === parseInt(groupId, 10));

    // Get all selectedRecipients the have ids in the recipientIds array.
    const selectedGroupRecipients = options.reduce((acc, curr) => {
      const groupRecipients = curr.options.filter(
        (option) => groupToUse.recipients.includes(parseInt(option.value, DECIMAL_BASE)),
      );
      return [...acc, ...groupRecipients];
    }, []);

    // Set selected recipients.
    const recipientsToSet = selectedGroupRecipients.map((r) => (
      {
        ...r, name: r.label, activityRecipientId: r.value,
      }));
    setValue('recipients', recipientsToSet, { shouldValidate: true });
    const recipientsToSetIds = recipientsToSet.map((r) => (r.value));
    setGroupRecipientIds(recipientsToSetIds);
  };

  return (
    <>
      {
        showGroupInfo && (
          <GroupAlert resetGroup={resetGroup} />
        )
        }
      {
        useGroups ? (
          <div className="margin-top-2">
            <FormItem
              label="Group name"
              name="recipientGroup"
            >
              <Dropdown
                required
                control={control}
                id="recipientGroup"
                name="recipientGroup"
                inputRef={register({ required: 'Select a group' })}
                onAbort={resetGroup}
                onChange={handleGroupChange}
              >
                <option value="" disabled selected hidden>- Select -</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Dropdown>
            </FormItem>
          </div>
        )
          : renderRecipients()
      }
      {
          groups.length > 0
           && (
           <div className="smart-hub-activity-summary-use-group margin-top-0 display-flex flex-align-center">
             <Checkbox
               id="use-group"
               label="Use group"
               className={`margin-top-1 ${showTooltip ? 'margin-right-1' : ''}`}
               onChange={toggleUseGroup}
               checked={useGroups}
             />
             {showTooltip && (
             <QuestionTooltip
               text="You can use a group to speed up selection, then remove recipients who did not attend."
             />
             )}
           </div>
           )
        }
      {
          useGroups
            ? renderRecipients()
            : null
        }
    </>
  );
};

RecipientsWithGroups.propTypes = {
  regionId: PropTypes.number.isRequired,
  showTooltip: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
};

RecipientsWithGroups.defaultProps = {
  showTooltip: false,
};

export default RecipientsWithGroups;
