import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { frequencyValues } from '../..';
import './NotificationsRow.css';

export default function NotificationsRow({
  id,
  label,
  emailVerified,
  setDisplayAlert,
  hideInApp = false,
}: {
  id: string;
  label: React.ReactNode;
  emailVerified: boolean;
  setDisplayAlert: (display: boolean) => void;
  hideInApp?: boolean;
}): JSX.Element {
  const { register, getValues } = useFormContext();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!emailVerified) {
      e.preventDefault();
      setDisplayAlert(true);
    }
  };

  return (
    <div className="display-flex flex-align-center">
      <div className="flex-1">{label}</div>

      {hideInApp ? (
        <div className="width-10" />
      ) : (
        <Checkbox
          id={`inApp${id}`}
          name={`inApp${id}`}
          label={<span className="usa-sr-only">In App</span>}
          defaultChecked={getValues(`inApp${id}`) ?? true}
          className="ttahub-in-app-checkbox width-10"
          inputRef={register()}
        />
      )}
      <label htmlFor={`email${id}`} className="usa-sr-only">
        Email
      </label>
      <Dropdown
        id={`email${id}`}
        name={`email${id}`}
        className="width-card"
        defaultValue={getValues(`email${id}`) || ''}
        inputRef={register()}
        onChange={handleChange}
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
