import React, { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import { uniqBy, isEqual, uniq } from 'lodash';
import MultiSelect from '../../MultiSelect';
import FormItem from '../../FormItem';
import { useLogContext } from './LogContext';
import GroupAlert from '../../GroupAlert';

export default function CommunicationRecipients() {
  const [showGroupAlert, setShowGroupAlert] = useState(false);
  const { recipients, groups } = useLogContext();
  const {
    register,
    control,
    setValue,
    watch,
  } = useFormContext();
  const [useGroup, setUseGroup] = useState(false);
  const recipientsSelected = watch('recipients');
  const recipientGroup = watch('recipientGroup');

  const recipientOptions = recipients.map((r) => ({ ...r, value: String(r.value) }));
  const recipientsInGroup = useMemo(() => {
    const selectedGroup = groups.find((group) => group.id === Number(recipientGroup));
    return selectedGroup ? uniq(selectedGroup.grants.map((gr) => gr.recipient.id)) : [];
  }, [groups, recipientGroup]);

  useEffect(() => {
    if (!useGroup) {
      setValue('recipientGroup', '');
    }
  }, [setValue, useGroup]);

  useEffect(() => {
    if (!recipientGroup) {
      setShowGroupAlert(false);
      return;
    }

    if (
      useGroup
      && !isEqual(recipientsSelected.map((r) => r.value), recipientsInGroup)
      && !showGroupAlert
    ) {
      setShowGroupAlert(true);
    } else if (useGroup && isEqual(recipientsSelected.map((r) => r.value), recipientsInGroup)) {
      setShowGroupAlert(false);
    }
  }, [
    recipientGroup,
    recipientsInGroup,
    recipientsSelected,
    setValue,
    showGroupAlert,
    useGroup,
  ]);

  const handleGroupSelection = (groupId) => {
    const selectedGroup = groups.find((group) => group.id === groupId);

    if (selectedGroup) {
      const selectedRecipients = uniqBy(selectedGroup.grants.map((gr) => {
        const { id: value, name: label } = gr.recipient;
        return { value, label };
      }), 'value');

      setValue('recipients', selectedRecipients);
    }
  };

  const onResetGroup = () => {
    handleGroupSelection(Number(recipientGroup));
  };

  const onSelectGroup = (e) => {
    handleGroupSelection(Number(e.target.value));
  };

  return (
    <div className="margin-top-2">
      {showGroupAlert && (<GroupAlert resetGroup={onResetGroup} />)}
      {useGroup ? (
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
              onChange={onSelectGroup}
              defaultValue=""
            >
              <option value="" disabled>- Select -</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Dropdown>
          </FormItem>
        </div>
      ) : (
        <FormItem
          label="Recipients"
          name="recipients"
        >
          <MultiSelect
            control={control}
            simple={false}
            name="recipients"
            id="recipients"
            options={recipientOptions}
            required="Select at least one"
            placeholderText="- Select -"
          />
        </FormItem>
      )}

      <div className="margin-top-1">
        <Checkbox
          id="use-group"
          label="Use group"
          name="useGroup"
          checked={useGroup}
          onChange={(e) => {
            setValue('recipientGroup', '');
            setUseGroup(e.target.checked);
          }}
        />
      </div>

      {useGroup && (
      <FormItem
        label="Recipients"
        name="recipients"
      >
        <MultiSelect
          control={control}
          simple={false}
          name="recipients"
          id="recipients"
          options={recipientOptions}
          required="Select at least one"
          placeholderText="- Select -"
        />
      </FormItem>
      )}

    </div>
  );
}
