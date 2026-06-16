import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { frequencyValues } from '../..';

export default function NotificationsGroupController({
  groupName,
  ids,
  label,
}: {
  groupName: string;
  ids: string[];
  label: string;
}): JSX.Element {
  const { setValue, control } = useFormContext();

  const [groupInAppSelected, setGroupInAppSelected] = useState(false);
  const [groupEmailSelected, setGroupEmailSelected] = useState('never');

  // Watch all email and inApp fields for this group so the group controls stay
  // in sync after async form population (e.g. getEmailSettings()).
  const emailFieldNames = ids.map((id) => `email${id}`);
  const inAppFieldNames = ids.map((id) => `inApp${id}`);
  const watchedEmailValues: string[] = useWatch({ control, name: emailFieldNames });
  const watchedInAppValues: boolean[] = useWatch({ control, name: inAppFieldNames });

  useEffect(() => {
    if (watchedEmailValues.length > 0) {
      const firstEmail = watchedEmailValues[0] ?? 'never';
      setGroupEmailSelected(firstEmail);
    }
  }, [watchedEmailValues]);

  useEffect(() => {
    if (watchedInAppValues.length > 0) {
      setGroupInAppSelected(Boolean(watchedInAppValues[0]));
    }
  }, [watchedInAppValues]);

  const handleGroupInAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setGroupInAppSelected(checked);
    ids.forEach((id) => {
      setValue(`inApp${id}`, checked);
    });
  };

  const handleGroupEmailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setGroupEmailSelected(value);
    ids.forEach((id) => {
      setValue(`email${id}`, value);
    });
  };

  return (
    <div className="display-flex flex-align-center">
      <div className="flex-1">{label}</div>

      <Checkbox
        id={`inApp${groupName}`}
        name={`inApp${groupName}`}
        label={<span className="usa-sr-only">In App</span>}
        checked={groupInAppSelected}
        className="ttahub-in-app-checkbox width-10"
        onChange={handleGroupInAppChange}
      />
      <label htmlFor={`email${groupName}`} className="usa-sr-only">
        Email
      </label>
      <Dropdown
        id={`email${groupName}`}
        name={`email${groupName}`}
        className="width-card"
        value={groupEmailSelected}
        onChange={handleGroupEmailChange}
      >
        {frequencyValues.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Dropdown>
    </div>
  );
}
