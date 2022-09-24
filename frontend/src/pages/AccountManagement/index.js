import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Button,
  Dropdown,
  Fieldset,
  Form,
  Grid,
  GridContainer,
  Radio,
} from '@trussworks/react-uswds';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import Avatar from '../../components/Avatar';
import UserContext from '../../UserContext';
import {
  subscribe,
  unsubscribe,
  updateSettings,
  getEmailSettings,
} from '../../fetchers/settings';

const emailPreferenceErrorMessage = 'Please select a frequency preference';

// these keys should match the keys in /src/constants.js:USER_SETTINGS.EMAIL.VALUES
const frequencyValues = [
  { key: 'never', label: 'Do not notify me' },
  { key: 'immediately', label: 'Immediately' },
  { key: 'today', label: 'Daily digest' },
  { key: 'this week', label: 'Weekly digest' },
  { key: 'this month', label: 'Monthly digest' },
];

const emailTypesMap = [
  {
    name: 'Activity report submitted for review',
    description: 'We\'ll email you when an activity report is submitted for your approval.',
    keyName: 'emailWhenReportSubmittedForReview',
  },
  {
    name: 'Activity report needs action',
    description: 'We\'ll email you when an activity report that you created or collaborated on needs action.',
    keyName: 'emailWhenChangeRequested',
  },
  {
    name: 'Activity report approved',
    description: 'We\'ll email you when an activity report that you created or collaborated on is approved.',
    keyName: 'emailWhenReportApproval',
  },
  {
    name: 'Added as collaborator',
    description: 'We\'ll email you when you are added as a collaborator to an activity report.',
    keyName: 'emailWhenAppointedCollaborator',
  },
];

function CustomizeEmailPreferencesForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div>
      <GridContainer>
        <Grid row className="margin-bottom-3">
          <Grid tablet={{ col: 12 }} desktop={{ col: 8 }} />
          <Grid tablet={{ col: 12 }} desktop={{ col: 4 }}>
            <div className="text-bold">Frequency</div>
          </Grid>
        </Grid>

        {emailTypesMap.map(({ name, description, keyName }) => (
          <Grid row key={keyName}>
            <Grid tablet={{ col: 12 }} desktop={{ col: 8 }}>
              <div className="text-bold">
                {name}
              </div>
              <div>
                {description}
              </div>
            </Grid>
            <Grid tablet={{ col: 12 }} desktop={{ col: 4 }}>
              <Dropdown
                id={keyName}
                name={keyName}
                data-testid={`${keyName}-dropdown`}
                inputRef={register({ required: emailPreferenceErrorMessage })}
              >
                {frequencyValues.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Dropdown>
              <p className="usa-error-message">{errors[keyName] && errors[keyName].message}</p>
            </Grid>
          </Grid>
        ))}
      </GridContainer>
    </div>
  );
}

function EmailPreferencesForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useFormContext();

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const emailPreference = watch('emailPreference');

  // Selecting a new radio button should remove the success/error message.
  useEffect(() => {
    setSaveSuccess(false);
    setSaveError(false);
  }, [emailPreference]);

  const onSubmit = async (formData) => {
    const newSettings = emailTypesMap.reduce((acc, { keyName }) => {
      acc.push({ key: keyName, value: formData[keyName] });
      return acc;
    }, []);

    try {
      const pref = formData.emailPreference;
      if (pref === 'subscribe') await subscribe();
      else if (pref === 'unsubscribe') await unsubscribe();
      else if (pref === 'customized') await updateSettings(newSettings);
      setSaveError(false);
      setSaveSuccess(true);
    } catch (error) {
      setSaveSuccess(false);
      setSaveError(error.message ? error.message : error);
    }
  };

  return (
    <Form
      data-testid="email-preferences-form"
      className="margin-top-5"
      onSubmit={handleSubmit(onSubmit)}
      style={{ maxWidth: 'unset' }} // remove the 20rem default
    >
      <Fieldset>
        {saveError && (
          <Alert type="error" data-testid="email-prefs-save-fail-message" className="margin-bottom-5">
            {saveError}
          </Alert>
        )}
        {saveSuccess && (
          <Alert type="success" data-testid="email-prefs-save-success-message" className="margin-bottom-5">
            Your email preferences have been saved.
          </Alert>
        )}
        <Radio
          id="allImmediately"
          data-testid="radio-subscribe"
          name="emailPreference"
          value="subscribe"
          label="Send me all TTA Hub related emails immediately"
          inputRef={register({ required: emailPreferenceErrorMessage })}
          className="margin-bottom-3"
        />
        <Radio
          id="customized"
          data-testid="radio-customized"
          name="emailPreference"
          value="customized"
          label="Let me customize the emails I want"
          inputRef={register({ required: emailPreferenceErrorMessage })}
          className="margin-bottom-3"
        />
        <div
          className="margin-bottom-3"
          style={{ display: emailPreference === 'customized' ? 'block' : 'none' }}
        >
          <CustomizeEmailPreferencesForm />
        </div>
        <Radio
          id="unsubscribe"
          data-testid="radio-unsubscribe"
          name="emailPreference"
          value="unsubscribe"
          label="Unsubscribe me from all TTA Hub emails"
          inputRef={register({ required: emailPreferenceErrorMessage })}
          className="margin-bottom-3"
        />
        <p className="usa-error-message">{errors.emailPreference && errors.emailPreference.message}</p>
      </Fieldset>
      <Button data-testid="email-prefs-submit" type="submit">Save Preferences</Button>
      <Button type="reset" outline>
        Cancel
      </Button>
    </Form>
  );
}

function AccountManagement() {
  const { user } = useContext(UserContext);

  const {
    register,
    handleSubmit,
    watch,
    formState,
    setValue,
  } = useForm({ defaultValues: { emailPreference: 'unsubscribe' } });

  const deduceEmailPreference = (settings) => {
    if (!settings.length) return 'unsubscribe';
    if (settings.every(({ value }) => value === 'never')) return 'unsubscribe';
    if (settings.every(({ value }) => value === 'immediately')) return 'subscribe';
    return 'customized';
  };

  useEffect(() => {
    getEmailSettings()
      .then((res) => {
        setValue('emailPreference', deduceEmailPreference(res));
        res.forEach(({ key, value }) => {
          setValue(key, value);
        });
      })
      .catch(() => {});
  }, [setValue]);

  const lastLoginFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.lastLogin));

  return (
    <>
      <Helmet>
        <title>Account Management</title>
      </Helmet>

      <h1 className="landing">Account Management</h1>

      {/* Profile box */}
      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h1 className="margin-bottom-1">Profile</h1>

        {/* Avatar w/ name */}
        <div className="margin-bottom-3">
          <h4 className="margin-0 display-flex flex-align-center padding-bottom-3 border-bottom border-gray-20">
            <Avatar name={user.name} />
            <span className="margin-left-2">{user.name}</span>
          </h4>
        </div>

        {/* Last login */}
        <div>
          <div className="text-bold">Last login</div>
          <div>{lastLoginFormatted}</div>
        </div>
      </div>

      {/* Email preferences box */}
      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h1 className="margin-bottom-1">Email preferences</h1>
        <FormProvider
          register={register}
          handleSubmit={handleSubmit}
          watch={watch}
          formState={formState}
        >
          <EmailPreferencesForm />
        </FormProvider>
      </div>
    </>
  );
}

export default AccountManagement;
