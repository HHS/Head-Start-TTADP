import React, {
  useState,
  useEffect,
  useContext,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Helmet } from 'react-helmet';
import { LANGUAGES, DECIMAL_BASE } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Radio,
  TextInput,
  Dropdown,
  Checkbox,
  Alert as USWDSAlert,
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
import { getPossibleSessionParticipants, getGroupsForSession } from '../../../fetchers/session';
import useTrainingReportRole from '../../../hooks/useTrainingReportRole';
import useTrainingReportTemplateDeterminator from '../../../hooks/useTrainingReportTemplateDeterminator';
import UserContext from '../../../UserContext';
import PocCompleteView from '../../../components/PocCompleteView';
import ReadOnlyField from '../../../components/ReadOnlyField';

const placeholderText = '- Select -';

const Participants = ({ formData }) => {
  const {
    control,
    register,
    watch,
    setValue,
  } = useFormContext();

  const { user } = useContext(UserContext);
  const { isPoc } = useTrainingReportRole(formData.event, user.id);
  const showReadOnlyView = useTrainingReportTemplateDeterminator(formData, isPoc);

  const regionId = watch('regionId');
  const watchFormRecipients = watch('recipients');
  const watchGroup = watch('recipientGroup');

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

  // Get Groups.
  const [groups, setGroups] = useState([]);
  const [useGroups, setUseGroups] = useState(false);
  const [groupRecipientIds, setGroupRecipientIds] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [fetchedGroups, setFetchedGroups] = useState(false);
  useEffect(() => {
    async function fetchGroups() {
      if (regionId && !fetchedGroups) {
        const retrievedGroups = await getGroupsForSession(regionId);

        // Add recipientIds to groups.
        const groupsWithRecipientIds = retrievedGroups.map((group) => ({
          ...group,
          // Match groups to grants as recipients could have multiple grants.
          recipients: group.grants.map((g) => g.id),
        }));
        setGroups(groupsWithRecipientIds);
        setFetchedGroups(true);
      }
    }
    fetchGroups();
  }, [regionId, groups, fetchedGroups]);

  useDeepCompareEffect(() => {
    if (useGroups) {
      // Determine if there are any recipients that are not in the group.
      const usedRecipientIds = (watchFormRecipients || []).map((r) => r.value);
      const selectedRecipientsNotInGroup = usedRecipientIds.filter(
        (option) => !groupRecipientIds.includes(option),
      );

      // If the user changes recipients manually while using groups.
      if (watchGroup
      && (groupRecipientIds.length !== watchFormRecipients.length
        || selectedRecipientsNotInGroup.length > 0)) {
        setShowGroupInfo(true);
        setUseGroups(false);
        setValue('recipientGroup', null, { shouldValidate: false });
        setGroupRecipientIds([]);
      }
    }
  }, [groupRecipientIds, setValue, useGroups, watchFormRecipients, watchGroup]);

  const options = (recipientOptions || []).map((recipient) => ({
    label: recipient.name,
    options: recipient.grants.map((grant) => ({
      value: grant.id,
      label: grant.name,
    })),
  }));

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

  const renderRecipients = () => (
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
  );

  const resetGroup = (checkUseGroup = true) => {
    setValue('recipientGroup', null, { shouldValidate: false });
    setGroupRecipientIds([]);
    setValue('recipients', [], { shouldValidate: false });
    setShowGroupInfo(false);
    if (checkUseGroup) {
      setUseGroups(true);
    }
  };

  const toggleUseGroup = (event) => {
    const { target: { checked = null } = {} } = event;
    // Reset.
    resetGroup(false);
    setUseGroups(checked);
  };

  const handleGroupChange = (event) => {
    const { value: groupId } = event.target;
    const groupToUse = groups.find((group) => group.id === parseInt(groupId, 10));

    // Get all selectedRecipients the have ids in the recipientIds array.
    const selectedGroupRecipients = options.reduce((acc, curr) => {
      const groupRecipients = curr.options.filter(
        (option) => groupToUse.recipients.includes(parseInt(option.value, DECIMAL_BASE)),
      );
      return [...acc, ...groupRecipients];
    }, []);

    // Set selected recipients.
    const recipientsToSet = selectedGroupRecipients.map((r) => (
      {
        ...r, name: r.label, activityRecipientId: r.value,
      }));
    setValue('recipients', recipientsToSet, { shouldValidate: true });
    const recipientsToSetIds = recipientsToSet.map((r) => (r.value));
    setGroupRecipientIds(recipientsToSetIds);
  };

  return (
    <>
      <Helmet>
        <title>Session Participants</title>
      </Helmet>
      <IndicatesRequiredField />
      {
        showGroupInfo && (
        <USWDSAlert type="info">
          You&apos;ve successfully modified the Group&apos;s recipients for this
          report. Changes here do not affect the Group itself.
          <button type="button" className="smart-hub-activity-summary-group-info usa-button usa-button--unstyled" onClick={resetGroup}>
            Reset or select a different group.
          </button>
        </USWDSAlert>
        )
        }
      {
        useGroups ? (
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
                onAbort={resetGroup}
                onChange={handleGroupChange}
              >
                <option value="" disabled selected hidden>- Select -</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Dropdown>
            </FormItem>
          </div>
        )
          : renderRecipients()
      }
      {
          groups.length > 0
           && (
           <div className="smart-hub-activity-summary-use-group margin-top-1">
             <Checkbox
               id="use-group"
               label="Use group"
               className="smart-hub--report-checkbox"
               onChange={toggleUseGroup}
               checked={useGroups}
             />
           </div>
           )
        }
      {
          useGroups
            ? renderRecipients(1, 5)
            : null
        }
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
