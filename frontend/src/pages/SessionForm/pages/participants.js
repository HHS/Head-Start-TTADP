import React, {
  useContext,
} from 'react';
import { Helmet } from 'react-helmet';
import { LANGUAGES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Radio,
  TextInput,
} from '@trussworks/react-uswds';
import { capitalize } from 'lodash';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import MultiSelect from '../../../components/MultiSelect';
import {
  participantsFields,
  pageComplete,
} from '../constants';
import { recipientParticipants } from '../../ActivityReport/constants'; // TODO - move to @ttahub/common
import FormItem from '../../../components/FormItem';
import useTrainingReportRole from '../../../hooks/useTrainingReportRole';
import useTrainingReportTemplateDeterminator from '../../../hooks/useTrainingReportTemplateDeterminator';
import UserContext from '../../../UserContext';
import PocCompleteView from '../../../components/PocCompleteView';
import ReadOnlyField from '../../../components/ReadOnlyField';
import RecipientsWithGroups from '../../../components/RecipientsWithGroups';

const placeholderText = '- Select -';

const Participants = ({ formData }) => {
  const {
    control,
    register,
    watch,
  } = useFormContext();

  const { user } = useContext(UserContext);
  const { isPoc } = useTrainingReportRole(formData.event, user.id);
  const showReadOnlyView = useTrainingReportTemplateDeterminator(formData, isPoc);
  const isHybrid = watch('deliveryMethod') === 'hybrid';

  if (showReadOnlyView) {
    return (
      <PocCompleteView formData={formData} userId={user.id}>
        <Helmet>
          <title>Session Participants</title>
        </Helmet>
        <ReadOnlyField label="Recipients">
          {formData.recipients.map((r) => r.label).join('\n')}
        </ReadOnlyField>
        {isHybrid ? (
          <>
            <ReadOnlyField label="Number of participants attending in person">
              {formData.numberOfParticipantsInPerson}
            </ReadOnlyField>
            <ReadOnlyField label="Number of participants attending virtually">
              {formData.numberOfParticipantsVirtually}
            </ReadOnlyField>
          </>
        ) : (
          <ReadOnlyField label="Number of participants">
            {formData.numberOfParticipants}
          </ReadOnlyField>
        )}
        <ReadOnlyField label="Recipient participants">
          {formData.participants.join('\n')}
        </ReadOnlyField>
        <ReadOnlyField label="Delivery method">
          {capitalize(formData.deliveryMethod)}
        </ReadOnlyField>
        <ReadOnlyField label="Language used">
          {formData.language.join('\n')}
        </ReadOnlyField>
      </PocCompleteView>
    );
  }

  return (
    <>
      <Helmet>
        <title>Session Participants</title>
      </Helmet>
      <IndicatesRequiredField />
      <RecipientsWithGroups />
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
        <div className="margin-top-2">
          <FormItem
            label="Language used"
            name="language"
          >
            <MultiSelect
              name="language"
              control={control}
              placeholderText={placeholderText}
              options={
              LANGUAGES
                .map((language) => ({ value: language, label: language }))
            }
              required="Select at least one language"
            />
          </FormItem>
        </div>
      </div>
    </>
  );
};

Participants.propTypes = {
  formData: participantsFields.isRequired,
};

const fields = Object.keys(participantsFields);
const path = 'participants';
const position = 2;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const { recipients, participants, language } = hookForm.getValues();

  if ((!recipients || !recipients.length)
      || (!participants || !participants.length)
      || (!language || !language.length)) {
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
    formData,
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
      <Participants formData={formData} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
