import { Accordion, Alert, Button } from '@trussworks/react-uswds';
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion';
import type {
  EmailFrequencyValue,
  EmailNotificationSettingKey,
  InAppNotificationSettingKey,
} from '@ttahub/common/src/notifications';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import NavigationPromptModal from '../../components/NavigationPromptModal';
import { getSettings, updateSettings } from '../../fetchers/settings';
import { requestVerificationEmail } from '../../fetchers/users';
import useNavigationPromptModal from '../../hooks/useNavigationPromptModal';
import UserContext from '../../UserContext';
import ActivityReportNotifications from './components/notifications/ActivityReportNotifications';
import CollabReportNotifications from './components/notifications/CollabReportNotifications';
import CommunicationLogNotifications from './components/notifications/CommunicationLogNotification';
import EmailValidationPreferenceBox from './components/notifications/EmailValidationPreferenceBox';
import OtherNotifications from './components/notifications/OtherNotifications';
import SystemRelatedNotifications from './components/notifications/SystemRelatedNotifications';
import TrainingReportNotifications from './components/notifications/TrainingReportNotifications';

type SettingFormData = Partial<Record<EmailNotificationSettingKey, EmailFrequencyValue>> &
  Partial<Record<InAppNotificationSettingKey, boolean>>;

// Every field rendered on this page, with the same defaults the UserSettings table uses.
// Any new notification field added to the page must also be added here. React Hook Form
// only treats the form as pristine when its values deep-equal this object, so a field that
// is rendered but missing here (or listed here but not rendered) makes the form look dirty
// after every change, and the unsaved-changes prompt can no longer tell real edits apart.
export const DEFAULT_SETTINGS: SettingFormData = {
  // Activity Reports
  emailWhenReportSubmittedForReview: 'never',
  inAppWhenReportSubmittedForReview: true,
  emailWhenCollaboratorReportSubmittedForReview: 'never',
  inAppWhenCollaboratorReportSubmittedForReview: true,
  emailWhenCreatorReportSubmittedForReview: 'never',
  inAppWhenCreatorReportSubmittedForReview: true,
  emailWhenChangeRequested: 'never',
  inAppWhenChangeRequested: true,
  emailWhenReportApproval: 'never',
  inAppWhenReportApproval: true,
  emailWhenAppointedCollaborator: 'never',
  inAppWhenAppointedCollaborator: true,
  emailWhenRecipientReportApprovedProgramSpecialist: 'never',
  inAppWhenRecipientReportApprovedProgramSpecialist: true,
  // Collaboration Reports
  emailWhenCollabReportSubmittedForReview: 'never',
  inAppWhenCollabReportSubmittedForReview: true,
  emailWhenCollaborationReportSubmittedForReview: 'never',
  inAppWhenCollaborationReportSubmittedForReview: true,
  emailWhenCollaborationReportCollaboratorSubmitted: 'never',
  inAppWhenCollaborationReportCollaboratorSubmitted: true,
  emailWhenCollaborationChangeRequested: 'never',
  inAppWhenCollaborationChangeRequested: true,
  emailWhenCollaborationReportApproved: 'never',
  inAppWhenCollaborationReportApproved: true,
  emailWhenAddedAsCollaborationCollaborator: 'never',
  inAppWhenAddedAsCollaborationCollaborator: true,
  // Communication Logs
  emailWhenAddedAsTTAStaffCommLog: 'never',
  inAppWhenAddedAsTTAStaffCommLog: true,
  emailWhenAddedAsRecipientCommLog: 'never',
  inAppWhenAddedAsRecipientCommLog: true,
  // Training Reports
  emailWhenAddedAsPocTrainingReport: 'never',
  inAppWhenAddedAsPocTrainingReport: true,
  emailWhenAddedAsCollaboratorTrainingReport: 'never',
  inAppWhenAddedAsCollaboratorTrainingReport: true,
  emailWhenSessionReviewRequestedTrainingReport: 'never',
  inAppWhenSessionReviewRequestedTrainingReport: true,
  emailWhenSessionChangesRequestedTrainingReport: 'never',
  inAppWhenSessionChangesRequestedTrainingReport: true,
  emailWhenEventDetails20DaysCreatorCollaborator: 'never',
  inAppWhenEventDetails20DaysCreatorCollaborator: true,
  emailWhenSessionDetails20DaysCreatorCollaborator: 'never',
  inAppWhenSessionDetails20DaysCreatorCollaborator: true,
  emailWhenSessionDetails20DaysPoc: 'never',
  inAppWhenSessionDetails20DaysPoc: true,
  emailWhenNoSessionsCreatorCollaborator: 'never',
  inAppWhenNoSessionsCreatorCollaborator: true,
  emailWhenEventNotCompleted: 'never',
  inAppWhenEventNotCompleted: true,
  // System Related (unplanned outage has no in-app checkbox)
  emailWhenPlannedOutage: 'never',
  inAppWhenPlannedOutage: true,
  emailWhenUnplannedOutage: 'never',
  // Other (added as co-owner has no in-app checkbox)
  emailWhenMonitoringDetailsAdded: 'never',
  inAppWhenMonitoringDetailsAdded: true,
  emailWhenAddedAsCoOwner: 'never',
  emailWhenSharedMyGroup: 'never',
  inAppWhenSharedMyGroup: true,
};

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

  const methods = useForm<SettingFormData>({
    defaultValues: DEFAULT_SETTINGS,
  });

  const {
    formState: { isDirty },
    reset,
  } = methods;

  const onSubmit = async (formData: SettingFormData): Promise<boolean> => {
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
      reset(formData);
      setSaveError(false);
      setSaveSuccess(true);
      return true;
    } catch (error) {
      setSaveSuccess(false);
      setSaveError(String(error.message || error));
      return false;
    } finally {
      setIsAppLoading(false);
    }
  };

  const saveAndContinue = async (): Promise<boolean> => {
    let saved = false;
    await methods.handleSubmit(async (formData: SettingFormData) => {
      saved = await onSubmit(formData);
    })();
    return saved;
  };

  const {
    isOpen: isNavigationPromptOpen,
    isSaving: isSavingAndContinuing,
    bypassOnce,
    continueWithoutSaving,
    dismiss,
    saveAndContinue: saveAndContinueNavigation,
  } = useNavigationPromptModal({ when: isDirty, onSave: saveAndContinue });

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
        const settings = await getSettings();
        // reset (not setValue) so the fetched values become the baseline isDirty compares against
        // only keep rendered keys; unregistered keys in the baseline would keep isDirty true
        reset({
          ...DEFAULT_SETTINGS,
          ...Object.fromEntries(
            settings
              .filter(({ key }) => key in DEFAULT_SETTINGS)
              .map(({ key, value }) => [key, value])
          ),
        });
      } catch (_error) {
        // fail silently, form defaults will be used
      } finally {
        setIsAppLoading(false);
      }
    }

    fetchSettings();
  }, [reset, setIsAppLoading]);

  return (
    <>
      <NavigationPromptModal
        isOpen={isNavigationPromptOpen}
        isSaving={isSavingAndContinuing}
        onContinueWithoutSaving={continueWithoutSaving}
        onSaveAndContinue={saveAndContinueNavigation}
        onDismiss={dismiss}
      />
      <Helmet>
        <title>Notification Preferences</title>
      </Helmet>
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
          <form
            onSubmit={methods.handleSubmit(async (formData: SettingFormData) => {
              await onSubmit(formData);
            })}
          >
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
              onClick={(event) => {
                if (
                  !event.defaultPrevented &&
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  bypassOnce();
                }
              }}
            >
              Cancel
            </Link>
          </form>
        </FormProvider>
      </Container>
    </>
  );
}
