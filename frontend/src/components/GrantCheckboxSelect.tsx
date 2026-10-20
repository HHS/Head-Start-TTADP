import { Checkbox, Table } from '@trussworks/react-uswds';
import React from 'react';
import FormFieldThatIsSometimesReadOnly from './GoalForm/FormFieldThatIsSometimesReadOnly';
import Req from './Req';
import './GrantCheckboxSelect.css';

export interface GrantCheckboxOption {
  /** the grant id */
  value: number;
  /** the grant number with its program types, e.g. "14HP1234 - EHS" */
  label: string;
}

interface GrantCheckboxSelectProps {
  /** every grant the selected recipient has that can be chosen */
  grants: GrantCheckboxOption[];
  /** the ids of the grants currently checked */
  checkedValues: number[];
  onToggle: (grant: GrantCheckboxOption) => void;
  onBlur?: () => void;
  /** the heading above the checkboxes */
  label?: string;
  /** the label used when there is only one grant and it is shown as read only text */
  readOnlyLabel?: string;
  /** shown in place of the checkboxes when there is only one grant */
  readOnlyValue?: string;
}

/**
 * A recipient's grants, as checkboxes. A recipient with a single grant has nothing to
 * choose between, so that grant is shown as read only text instead - the grant is still
 * selected, the caller just does it on the user's behalf.
 */
export default function GrantCheckboxSelect({
  grants,
  checkedValues,
  onToggle,
  onBlur,
  label = "Recipient's Grants",
  readOnlyLabel = "Recipient's grants",
  readOnlyValue,
}: GrantCheckboxSelectProps): React.ReactElement {
  return (
    <FormFieldThatIsSometimesReadOnly
      permissions={[grants.length > 1]}
      label={readOnlyLabel}
      value={readOnlyValue ?? (grants.length > 0 ? grants[0].label : '')}
    >
      <p className="usa-prose margin-bottom-0" data-testid="recipient-grants-label">
        {label} <Req announce />
      </p>
      <Table className="grant-checkbox-select-table">
        <tbody>
          {grants.map((grant, index) => (
            <tr key={grant.value}>
              <td>
                <Checkbox
                  id={`${grant.value}-grant`}
                  key={`${grant.value}-grant-key`}
                  name={grant.label}
                  label={grant.label}
                  onChange={() => onToggle(grant)}
                  checked={checkedValues.includes(grant.value)}
                  aria-label={`Select grant ${grant.label}`}
                  onBlur={onBlur}
                  data-testid={`recipient-grant-checkbox-${index}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </FormFieldThatIsSometimesReadOnly>
  );
}
