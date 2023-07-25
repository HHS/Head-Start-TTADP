import React, {
  useState,
  useEffect,
} from 'react';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Radio,
  TextInput,
  Textarea,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import MultiSelect from '../../../components/MultiSelect';
import {
  participantsFields,
  pageComplete,
} from '../constants';
import { recipientParticipants } from '../../ActivityReport/constants'; // TODO - move to @ttahub/common
import FormItem from '../../../components/FormItem';
import { getPossibleSessionParticipants } from '../../../fetchers/session';

const placeholderText = '- Select -';

const Participants = () => {
  const {
    control,
    register,
    watch,
  } = useFormContext();

  const regionId = watch('regionId');

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

  const isHybrid = watch('deliveryMethod') === 'hybrid';

  return (
    <>
      <Helmet>
        <title>Session participants</title>
      </Helmet>
      <IndicatesRequiredField />
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

      <div className="margin-top-2">
        <FormItem
          label="Recipient participants "
          name="participants"
        >
          <MultiSelect
            name="participants"
            control={control}
            placeholderText={placeholderText}
            options={
              recipientParticipants
                .map((participant) => ({ value: participant, label: participant }))
            }
            required="Select at least one participant"
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="How was the activity conducted?"
          name="deliveryMethod"
          fieldSetWrapper
        >
          <Radio
            id="delivery-method-in-person"
            name="deliveryMethod"
            label="In Person"
            value="in-person"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />

          <Radio
            id="delivery-method-virtual"
            name="deliveryMethod"
            label="Virtual"
            value="virtual"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />

          <Radio
            id="delivery-method-hybrid"
            name="deliveryMethod"
            label="Hybrid"
            value="hybrid"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />
        </FormItem>
        <div aria-live="polite">
          {isHybrid ? (
            <>
              <div>
                <FormItem
                  label="Number of participants attending in person "
                  name="numberOfParticipantsInPerson"
                  required
                >
                  <div className="maxw-card-lg">
                    <TextInput
                      id="numberOfParticipantsInPerson"
                      name="numberOfParticipantsInPerson"
                      type="number"
                      min={1}
                      required
                      inputRef={
                        register({
                          required: 'Enter number of participants attending in person',
                          valueAsNumber: true,
                          min: {
                            value: 1,
                            message: 'Number of participants can not be zero or negative',
                          },
                        })
                      }
                    />
                  </div>
                </FormItem>
              </div>
              <div>
                <FormItem
                  label="Number of participants attending virtually "
                  name="numberOfParticipantsVirtually"
                  required
                >
                  <div className="maxw-card-lg">
                    <TextInput
                      required
                      id="numberOfParticipantsVirtually"
                      name="numberOfParticipantsVirtually"
                      type="number"
                      min={1}
                      inputRef={
                        register({
                          required: 'Enter number of participants attending virtually',
                          valueAsNumber: true,
                          min: {
                            value: 1,
                            message: 'Number of participants can not be zero or negative',
                          },
                        })
                      }
                    />
                  </div>
                </FormItem>
              </div>
            </>
          ) : (
            <div>
              <FormItem
                label="Number of participants "
                name="numberOfParticipants"
              >
                <div className="maxw-card-lg">
                  <TextInput
                    required
                    id="numberOfParticipants"
                    name="numberOfParticipants"
                    type="number"
                    min={1}
                    inputRef={
                      register({
                        required: 'Enter number of participants',
                        valueAsNumber: true,
                        min: {
                          value: 1,
                          message: 'Number of participants can not be zero or negative',
                        },
                      })
                    }
                  />
                </div>
              </FormItem>
            </div>
          )}
        </div>
      </div>

      <FormItem
        label="TTA provided "
        name="ttaProvided"
        required
      >
        <Textarea
          required
          id="ttaProvided"
          name="ttaProvided"
          inputRef={register({
            required: 'Describe the tta provided',
          })}
        />
      </FormItem>
    </>
  );
};

const fields = Object.keys(participantsFields);
const path = 'participants';
const position = 2;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const { recipients, participants } = hookForm.getValues();
  if (!recipients || !recipients.length || !participants || !participants.length) {
    return false;
  }

  return pageComplete(hookForm, fields);
};

export default {
  position,
  label: 'Participants',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <Participants />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save session</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
