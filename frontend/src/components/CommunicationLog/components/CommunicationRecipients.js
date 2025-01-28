import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import { uniqBy } from 'lodash';
import MultiSelect from '../../MultiSelect';
import FormItem from '../../FormItem';
import { useLogContext } from '../LogContext';

export default function CommunicationRecipients() {
  const { recipients, groups } = useLogContext();
  const {
    register,
    control,
    setValue,
    watch,
  } = useFormContext();
  const useGroup = watch('useGroup');

  const recipientOptions = recipients.map((r) => ({ ...r, value: String(r.value) }));
  useEffect(() => {
    if (!useGroup) {
      setValue('recipientGroup', '');
    }
  }, [setValue, useGroup]);

  const handleGroupSelection = (e) => {
    const selectedGroup = groups.find((group) => group.id === Number(e.target.value));

    if (selectedGroup) {
      const selectedRecipients = uniqBy(selectedGroup.grants.map((gr) => {
        const { id: value, name: label } = gr.recipient;
        return { value, label };
      }), 'value');

      setValue('recipients', selectedRecipients);
    }
  };

  return (
    <div className="margin-top-2">
      {useGroup && (
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
              onChange={handleGroupSelection}
              defaultValue=""
            >
              <option value="" disabled>- Select -</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Dropdown>
          </FormItem>
        </div>
      )}
      <FormItem
        label="Recipients"
        name="recipients"
        htmlFor="recipients"
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

      {groups.length > 0 && (
      <div className="margin-top-1">
        <Checkbox
          id="use-group"
          label="Use group"
          name="useGroup"
          inputRef={register()}
        />
      </div>
      )}
    </div>
  );
}
