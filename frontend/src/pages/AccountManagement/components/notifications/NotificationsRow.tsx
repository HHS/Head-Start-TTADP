import { Checkbox, Dropdown } from '@trussworks/react-uswds';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
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
  const { control, getValues } = useFormContext();

  return (
    <div className="display-flex flex-align-center">
      <div className="flex-1">{label}</div>

      {hideInApp ? (
        <div className="width-10" />
      ) : (
        <Controller
          control={control}
          name={`inApp${id}`}
          defaultValue={getValues(`inApp${id}`) ?? true}
          render={({ onChange, value }) => (
            <Checkbox
              id={`inApp${id}`}
              name={`inApp${id}`}
              label={<span className="usa-sr-only">In App</span>}
              checked={Boolean(value)}
              className="ttahub-in-app-checkbox width-10"
              onChange={(e) => onChange(e.target.checked)}
            />
          )}
        />
      )}
      <label htmlFor={`email${id}`} className="usa-sr-only">
        Email
      </label>
      <Controller
        control={control}
        name={`email${id}`}
        defaultValue={getValues(`email${id}`) || ''}
        render={({ onChange, value }) => (
          <Dropdown
            id={`email${id}`}
            name={`email${id}`}
            className="width-card"
            value={value || ''}
            onChange={(e) => {
              if (!emailVerified) {
                setDisplayAlert(true);
                return;
              }
              onChange(e.target.value);
            }}
          >
            <option value="" disabled hidden>
              - Select -
            </option>
            {frequencyValues.map(({ key, label: optionLabel }) => (
              <option key={key} value={key}>
                {optionLabel}
              </option>
            ))}
          </Dropdown>
        )}
      />
    </div>
  );
}
