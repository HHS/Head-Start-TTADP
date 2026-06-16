import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { frequencyValues } from '../..';

export default function NotificationsGroupController({
  groupName,
  ids,
  label,
  emailVerified,
  setDisplayAlert,
}: {
  groupName: string;
  ids: string[];
  label: string;
  emailVerified: boolean;
  setDisplayAlert: (display: boolean) => void;
}): JSX.Element {
  const { setValue, control } = useFormContext();

  const [groupInAppSelected, setGroupInAppSelected] = useState(false);
  const [groupEmailSelected, setGroupEmailSelected] = useState('');

  // Watch all email and inApp fields for this group so the group controls stay
  // in sync after async form population (e.g. getEmailSettings()).
  const inAppFieldNames = ids.map((id) => `inApp${id}`);
  const watchedInAppValues: boolean[] | undefined = useWatch({
    control,
    name: inAppFieldNames,
  });

  useEffect(() => {
    const values = watchedInAppValues ? Object.values(watchedInAppValues) : [];
    setGroupInAppSelected(values.length > 0 && values.every((value) => value === true));
  }, [watchedInAppValues]);

  const handleGroupInAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setGroupInAppSelected(checked);
    ids.forEach((id) => {
      setValue(`inApp${id}`, checked);
    });
  };

  const handleGroupEmailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!emailVerified) {
      setDisplayAlert(true);
      return;
    }
    const { value } = e.target;
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
        <option value="" disabled hidden>
          - Select -
        </option>
        {frequencyValues.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Dropdown>
    </div>
  );
}
