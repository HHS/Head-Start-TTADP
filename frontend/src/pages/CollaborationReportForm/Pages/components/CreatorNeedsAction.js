import React, { useMemo } from 'react';
import {
  Form,
  Fieldset,
  Button,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../../components/FormItem';
import ApproverSelect from '../../../ActivityReport/Pages/Review/Submitter/components/ApproverSelect';
import { reviewPageDefaultProps, reviewPagePropType } from './constants';
import useExistingApprovers from '../../../../hooks/useExistingApprovers';
import ApproverStatusList from '../../../ActivityReport/Pages/components/ApproverStatusList';
import DisplayApproverNotes from '../../../ActivityReport/Pages/components/DisplayApproverNotes';

export default function CreatorNeedsAction({
  onSubmit,
  availableApprovers,
}) {
  // eslint-disable-next-line max-len
  const approverOptions = useMemo(() => (availableApprovers || []).map((a) => ({ value: a.id, label: a.name })), [availableApprovers]);
  const { handleSubmit } = useFormContext();
  const { initialValue } = useExistingApprovers(approverOptions);

  const h3classes = 'usa-prose margin-top-0 margin-bottom-1';

  return (
    <>
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onSubmit)}>
        <div className="margin-bottom-4">
          <h3 className={h3classes}>Approval status</h3>
          <ApproverStatusList approverStatus={initialValue} />
        </div>
        <div className="margin-bottom-4">
          <h3 className={h3classes}>Manager notes</h3>
          <DisplayApproverNotes approverStatusList={initialValue} />
        </div>

        <div className="margin-bottom-4">
          <Fieldset className="smart-hub--report-legend smart-hub--report-legend--collapse-form-group">
            <FormItem
              label="Add additional approvers"
              name="approvers"
              required={false}
            >
              <ApproverSelect
                name="approvers"
                valueProperty="user.id"
                labelProperty="user.fullName"
                options={approverOptions}
                filterInitialValue
                required={false}
              />
            </FormItem>
          </Fieldset>
        </div>
        <Button type="submit">Update report</Button>
      </Form>
    </>
  );
}

CreatorNeedsAction.propTypes = reviewPagePropType;
CreatorNeedsAction.defaultProps = reviewPageDefaultProps;
