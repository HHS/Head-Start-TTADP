import { Accordion, Alert, Button } from '@trussworks/react-uswds';
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import { getEmailSettings, updateSettings } from '../../fetchers/settings';
import { requestVerificationEmail } from '../../fetchers/users';
import UserContext from '../../UserContext';
import ActivityReportNotifications from './components/notifications/ActivityReportNotifications';
import CollabReportNotifications from './components/notifications/CollabReportNotifications';
import CommunicationLogNotifications from './components/notifications/CommunicationLogNotification';
import EmailValidationPreferenceBox from './components/notifications/EmailValidationPreferenceBox';
import OtherNotifications from './components/notifications/OtherNotifications';
import SystemRelatedNotifications from './components/notifications/SystemRelatedNotifications';
import TrainingReportNotifications from './components/notifications/TrainingReportNotifications';

type EmailFrequency = 'never' | 'immediately' | 'today' | 'this week' | 'this month';

interface SettingFormData {
  emailWhenAppointedCollaborator: EmailFrequency;
  emailWhenChangeRequested: EmailFrequency;
  emailWhenRecipientReportApprovedProgramSpecialist: EmailFrequency;
  emailWhenReportApproval: EmailFrequency;
  emailWhenReportSubmittedForReview: EmailFrequency;
  inAppWhenAppointedCollaborator: boolean;
  inAppWhenChangeRequested: boolean;
  inAppWhenRecipientReportApprovedProgramSpecialist: boolean;
  inAppWhenReportApproval: boolean;
  inAppWhenReportSubmittedForReview: boolean;
}

export default function ManageNotifications({
  updateUser,
}: {
  updateUser: (user: { id: number }) => void;
}): JSX.Element {
  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext) as {
    setIsAppLoading: (isLoading: boolean) => void;
  };
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearAlerts, setClearAlerts] = useState(false);
  const [saveError, setSaveError] = useState<string | false>(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [verificationEmailSendError, setVerificationEmailSendError] = useState<string | false>(
    false
  );

  useEffect(() => {
    // reset the clear alerts watcher
    // after it triggers a change in the child components to clear their alerts
    // after sending a verification email
    if (clearAlerts) {
      setClearAlerts(false);
    }
  }, [clearAlerts]);

  const sendVerificationEmail = useCallback(() => {
    setClearAlerts(true);
    requestVerificationEmail()
      .then(() => {
        setEmailVerificationSent(true);
      })
      .catch((error) => {
        setVerificationEmailSendError(String(error.message || error));
      });
  }, []);

  const accordionItems = useMemo(
    () =>
      [
        {
          title: 'Activity Reports',
          content: (
            <ActivityReportNotifications
              clearAlerts={clearAlerts}
              emailVerified={emailValidated}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'activity-report-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
        {
          title: 'Collaboration Reports',
          content: (
            <CollabReportNotifications
              clearAlerts={clearAlerts}
              emailVerified={emailValidated}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'collab-report-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
        {
          title: 'Communication Logs',
          content: (
            <CommunicationLogNotifications
              clearAlerts={clearAlerts}
              emailVerified={emailValidated}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'communication-log-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
        {
          title: 'Training Reports',
          content: (
            <TrainingReportNotifications
              emailVerified={emailValidated}
              clearAlerts={clearAlerts}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'training-report-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
        {
          title: 'System Related',
          content: (
            <SystemRelatedNotifications
              emailVerified={emailValidated}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'system-related-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
        {
          title: 'Other',
          content: (
            <OtherNotifications
              emailVerified={emailValidated}
              sendVerificationEmail={sendVerificationEmail}
              emailVerificationSent={emailVerificationSent}
            />
          ),
          id: 'other-notifications',
          expanded: true,
          headingLevel: 'h2',
        },
      ] as AccordionItemProps[],
    [emailValidated, sendVerificationEmail, emailVerificationSent, clearAlerts]
  );

  const methods = useForm({
    defaultValues: {
      emailWhenAppointedCollaborator: 'never',
      emailWhenChangeRequested: 'never',
      emailWhenRecipientReportApprovedProgramSpecialist: 'never',
      emailWhenReportApproval: 'never',
      emailWhenReportSubmittedForReview: 'never',
      inAppWhenAppointedCollaborator: true,
      inAppWhenChangeRequested: true,
      inAppWhenRecipientReportApprovedProgramSpecialist: true,
      inAppWhenReportApproval: true,
      inAppWhenReportSubmittedForReview: true,
    },
  });

  const { setValue } = methods;

  useEffect(() => {
    const emailValidationStatus = (user.validationStatus ?? []).find(
      ({ type }) => type === 'email'
    );
    if (emailValidationStatus?.validatedAt) {
      setEmailValidated(true);
      return;
    }

    setEmailValidated(false);
  }, [user.validationStatus]);

  useEffect(() => {
    async function fetchSettings() {
      setIsAppLoading(true);
      try {
        const res = await getEmailSettings();
        res.forEach(({ key, value }) => {
          setValue(key, value);
        });
      } catch (_error) {
        // fail silently, form defaults will be used
      } finally {
        setIsAppLoading(false);
      }
    }

    fetchSettings();
  }, [setValue, setIsAppLoading]);

  const onSubmit = async (formData: SettingFormData) => {
    const settingsData = Object.entries(formData).map(([key, value]) => ({
      key,
      value,
    }));

    const newSettings = [];

    settingsData.forEach(({ key, value }) => {
      // note that the backend validates these settings
      // against existing UserSettings
      if (!emailValidated && key.startsWith('email')) {
        // if the email is not validated, don't send email settings to the backend
        // but still send in-app notification settings
        return;
      }

      newSettings.push({ key, value });
    });

    try {
      setIsAppLoading(true);
      await updateSettings(newSettings);
      setSaveError(false);
      setSaveSuccess(true);
    } catch (error) {
      setSaveSuccess(false);
      setSaveError(String(error.message || error));
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <>
      <BackLink to="/notifications">Back to Notifications</BackLink>
      <h1 className="landing margin-top-0">Notification Preferences</h1>
      <EmailValidationPreferenceBox
        emailVerificationSent={emailVerificationSent}
        emailValidated={emailValidated}
        updateUser={updateUser}
        sendVerificationEmail={sendVerificationEmail}
        verificationEmailSendError={verificationEmailSendError}
      />
      <Container>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            {saveSuccess && (
              <Alert headingLevel="h2" type="success" className="margin-bottom-2">
                Your preferences have been saved.
              </Alert>
            )}
            {saveError && (
              <Alert headingLevel="h2" type="error" className="margin-bottom-2">
                There was an error saving your preferences: {saveError}
              </Alert>
            )}
            <Accordion items={accordionItems} multiselectable />
            <Button type="submit" className="margin-top-2">
              Save preferences
            </Button>
            <Link
              to="/notifications"
              className="usa-button usa-button--outline margin-top-2 margin-left-1"
            >
              Cancel
            </Link>
          </form>
        </FormProvider>
      </Container>
    </>
  );
}
