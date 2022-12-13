import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Button,
  Dropdown,
  Fieldset,
  Form,
  Grid,
  GridContainer,
  Link,
  Radio,
} from '@trussworks/react-uswds';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import Avatar from '../../components/Avatar';
import UserContext from '../../UserContext';
import {
  subscribe,
  unsubscribe,
  updateSettings,
  getEmailSettings,
} from '../../fetchers/settings';
import { requestVerificationEmail } from '../../fetchers/users';
import EmailVerifier from './EmailVerifier';

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
    name: '',
    description: 'Someone submits an activity report for my approval.',
    keyName: 'emailWhenReportSubmittedForReview',
  },
  {
    name: '',
    description: 'A manager requests changes to an activity report that I created or collaborated on.',
    keyName: 'emailWhenChangeRequested',
  },
  {
    name: '',
    description: 'Manager approves an activity report that I created or collaborated on.',
    keyName: 'emailWhenReportApproval',
  },
  {
    name: '',
    description: 'I\'m added as a collaborator on an activity report.',
    keyName: 'emailWhenAppointedCollaborator',
  },
  {
    name: 'Program Specialists only',
    description: 'One of my recipients\' activity reports is available.',
    keyName: 'emailWhenRecipientReportApprovedProgramSpecialist',
  },
];

function CustomizeEmailPreferencesForm({ disabled }) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  if (disabled) return null;

  return (
    <div>
      <GridContainer>
        <Grid row className="margin-bottom-3">
          <Grid tablet={{ col: 12 }} desktop={{ col: 7 }} className="desktop:display-block display-none">
            <div className="text-bold">Event</div>
          </Grid>
          <Grid tablet={{ col: 12 }} desktop={{ col: 3 }} className="desktop:display-block display-none">
            <div className="text-bold">Frequency</div>
          </Grid>
        </Grid>

        {emailTypesMap.map(({ name, description, keyName }) => (
          <Grid row key={keyName}>
            <Grid tablet={{ col: 12 }} desktop={{ col: 7 }}>
              <div>
                { name && <span className="text-italic">{name}</span> }
              </div>
              <div className="margin-right-2">
                {description}
              </div>
            </Grid>
            <Grid tablet={{ col: 12 }} desktop={{ col: 3 }}>
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

CustomizeEmailPreferencesForm.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

function EmailPreferencesForm({ disabled, onSave }) {
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
    onSave();
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
      onSubmit={handleSubmit(onSubmit)}
      style={{ maxWidth: 'unset' }} // remove the 20rem default
    >
      <Fieldset>
        {saveError && (
          <Alert
            type="error"
            data-testid="email-prefs-save-fail-message"
            className="margin-bottom-3"
          >
            {saveError}
          </Alert>
        )}
        {saveSuccess && (
          <Alert
            type="success"
            data-testid="email-prefs-save-success-message"
            className="margin-bottom-3"
          >
            Your email preferences have been saved.
          </Alert>
        )}
        <Radio
          id="allImmediately"
          data-testid="radio-subscribe"
          name="emailPreference"
          value="subscribe"
          disabled={disabled}
          label="Send me all TTA Hub related emails immediately"
          inputRef={register({ required: emailPreferenceErrorMessage })}
          className="margin-bottom-3"
        />
        <Radio
          id="customized"
          data-testid="radio-customized"
          name="emailPreference"
          value="customized"
          disabled={disabled}
          label="Let me customize the emails I want"
          inputRef={register({ required: emailPreferenceErrorMessage })}
          className="margin-bottom-3"
        />
        <div
          className="margin-bottom-3"
          style={{ display: emailPreference === 'customized' ? 'block' : 'none' }}
        >
          <CustomizeEmailPreferencesForm disabled={disabled} />
        </div>
        <Radio
          id="unsubscribe"
          data-testid="radio-unsubscribe"
          name="emailPreference"
          value="unsubscribe"
          disabled={disabled}
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

EmailPreferencesForm.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
};

function AccountManagement({ updateUser }) {
  const { user } = useContext(UserContext);
  const { token } = useParams();

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

  const [emailValidated, setEmailValidated] = useState(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [verificationEmailSendError, setVerificationEmailSendError] = useState(false);
  const [showVerifier, setShowVerifier] = useState(true);

  useEffect(() => {
    const emailValidationStatus = user.validationStatus.find(({ type }) => type === 'email');
    if (emailValidationStatus && emailValidationStatus.validatedAt) {
      setEmailValidated(true);
      return;
    }

    setEmailValidated(false);
  }, [user.validationStatus]);

  const sendVerificationEmail = () => {
    requestVerificationEmail()
      .then(() => {
        setEmailVerificationSent(true);
      })
      .catch((error) => {
        setVerificationEmailSendError(error.message ? error.message : error);
      });
  };

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
        <h1 className="margin-bottom-3">Email preferences</h1>

        {showVerifier && (
          <EmailVerifier token={token} updateUser={updateUser} />
        )}

        {!emailValidated && !emailVerificationSent && (
          <Alert type="warning">
            Your email address isn&apos;t verified.
            Select &apos;Send verification email&apos; below.
          </Alert>
        )}

        {!emailValidated && emailVerificationSent && (
          <Alert type="info">
            Verification email sent. Check your inbox.
            <br />
            If you don&apos;t receive an email within thirty minutes,
            check your spam folder, then&nbsp;
            <Link href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a" target="_blank" rel="noopener noreferrer">
              request support
            </Link>
            .
          </Alert>
        )}

        {!emailValidated && (
          <>
            <h2>Verify email address</h2>
            <p>
              Before you can receive TTA Hub emails, you must verify your email address.
              <Button
                data-testid="send-verification-email-button"
                className="display-block margin-top-3"
                onClick={sendVerificationEmail}
              >
                {emailVerificationSent ? 'Resend verification email' : 'Send verification email'}
              </Button>
            </p>
          </>
        )}

        {verificationEmailSendError && (
          <Alert type="error">
            {verificationEmailSendError}
          </Alert>
        )}

        {emailValidated && (
          <FormProvider
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            formState={formState}
          >
            <EmailPreferencesForm
              disabled={!emailValidated}
              onSave={() => setShowVerifier(false)}
            />
          </FormProvider>
        )}

      </div>
    </>
  );
}

AccountManagement.propTypes = {
  updateUser: PropTypes.func.isRequired,
};

export default AccountManagement;
