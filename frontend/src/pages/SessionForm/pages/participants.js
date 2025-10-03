import React from 'react';
import PropTypes from 'prop-types';
import { TRAINING_REPORT_STATUSES, LANGUAGES } from '@ttahub/common';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Radio,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import MultiSelect from '../../../components/MultiSelect';
import {
  participantsFields,
  pageComplete,
} from '../constants';
import { recipientParticipants } from '../../ActivityReport/constants'; // TODO - move to @ttahub/common
import ParticipantsNumberOfParticipants from '../../../components/ParticipantsNumberOfParticipants';
import FormItem from '../../../components/FormItem';
import RecipientsWithGroups from '../../../components/RecipientsWithGroups';

const placeholderText = '- Select -';

const Participants = ({ formData }) => {
  const {
    control,
    register,
    watch,
  } = useFormContext();

  const deliveryMethod = watch('deliveryMethod');

  const regionId = watch('regionId');
  const eventRegionId = formData.event ? formData.event.regionId : null;

  return (
    <>
      <Helmet>
        <title>Session Participants</title>
      </Helmet>
      <IndicatesRequiredField />
      <RecipientsWithGroups
        regionId={regionId || eventRegionId}
      />
      <div className="margin-top-2">
        <FormItem
          label="Recipient participants"
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
          label="What type of TTA was provided?"
          name="ttaType"
          fieldSetWrapper
        >
          <Checkbox
            id="training"
            label="Training"
            value="training"
            name="ttaType"
            className="smart-hub--report-checkbox"
            inputRef={register({
              required: 'Select at least one',
            })}
          />
          <Checkbox
            id="technical-assistance"
            label="Technical Assistance"
            value="technical-assistance"
            name="ttaType"
            className="smart-hub--report-checkbox"
            inputRef={register({
              required: 'Select at least one',
            })}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Delivery method"
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

        <ParticipantsNumberOfParticipants
          isHybrid={deliveryMethod === 'hybrid'}
          register={register}
          isDeliveryMethodSelected={['virtual', 'hybrid', 'in-person'].includes(deliveryMethod)}
        />

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
  formData: PropTypes.shape({
    recipients: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
    })),
    regionId: PropTypes.number,
    istSelectionComplete: PropTypes.bool,
    event: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      displayId: PropTypes.string,
      status: PropTypes.string,
      pageState: PropTypes.objectOf(PropTypes.string),
      regionId: PropTypes.number,
    }),
    numberOfParticipants: PropTypes.number,
    numberOfParticipantsInPerson: PropTypes.number,
    numberOfParticipantsVirtually: PropTypes.number,
    participants: PropTypes.arrayOf(PropTypes.string),
    deliveryMethod: PropTypes.string,
    language: PropTypes.arrayOf(PropTypes.string),
    isIstVisit: PropTypes.string,
    regionalOfficeTta: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

const fields = Object.keys(participantsFields);
const path = 'participants';
const position = 2;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const { isIstVisit } = hookForm.getValues();

  if (isIstVisit === 'yes') {
    return pageComplete(hookForm, [...fields, 'regionalOfficeTta'], true);
  }

  if (isIstVisit === 'no') {
    return pageComplete(hookForm, [...fields, 'recipients', 'participants']);
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
    additionalData,
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
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>{additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE ? 'Save and continue' : 'Continue' }</Button>
        {
          additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE && (
            <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
          )
      }
        {
              additionalData
              && additionalData.isAdminUser && (
              <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
              )
      }
      </div>
    </div>
  ),
  isPageComplete,
};
