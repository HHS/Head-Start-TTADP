/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, {
  useState,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import {
  Form,
  Grid,
  Alert,
} from '@trussworks/react-uswds';
import moment from 'moment';
import useInterval from '@use-it/interval';
import Container from '../Container';
import SocketAlert from '../SocketAlert';
import {
  IN_PROGRESS, COMPLETE,
} from './constants';
import SideNav from './components/SideNav';
import NavigatorHeader from './components/NavigatorHeader';
import DismissingComponentWrapper from '../DismissingComponentWrapper';
import AppLoadingContext from '../../AppLoadingContext';

const Navigator = ({
  formData,
  pages,
  onFormSubmit,
  onReview,
  onResetToDraft,
  currentPage,
  additionalData,
  onSave,
  autoSaveInterval,
  isApprover,
  isPendingApprover,
  reportId,
  updatePage,
  reportCreator,
  lastSaveTime,
  errorMessage,
  savedToStorageTime,
  socketMessageStore,
  onSaveDraft,
  onSaveAndContinue,
  showSavedDraft,
  updateShowSavedDraft,
  datePickerKey,
  formDataStatusProp,
}) => {
  const page = useMemo(() => pages.find((p) => p.path === currentPage), [currentPage, pages]);
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [weAreAutoSaving, setWeAreAutoSaving] = useState(false);

  const context = useFormContext();

  const { watch, formState } = context;

  const pageState = watch('pageState');

  const setSavingLoadScreen = (isAutoSave = false) => {
    if (!isAutoSave && !isAppLoading) {
      setAppLoadingText('Saving');
      setIsAppLoading(true);
    }
  };

  const { isDirty } = formState;

  const onUpdatePage = async (index) => {
    // name the parameters for clarity
    const isAutoSave = false;
    const isNavigation = true;

    // save the current page
    await onSaveDraft(isAutoSave, isNavigation);

    // navigate to the next page
    if (index !== page.position) {
      updatePage(index);
      updateShowSavedDraft(false);
    }
  };

  const onContinue = () => {
    if (onSaveAndContinue) {
      onSaveAndContinue();
      return;
    }
    setSavingLoadScreen();
    onUpdatePage(page.position + 1);
  };

  useInterval(async () => {
    // Don't auto save if we are already saving, or if the form hasn't been touched
    try {
      if (!isAppLoading && isDirty && !weAreAutoSaving) {
        // this is used to disable the save buttons
        // (we don't use the overlay on auto save)
        setWeAreAutoSaving(true);
        await onSaveDraft(true);
      }
    } finally {
      setWeAreAutoSaving(false); // enable the save buttons
    }
  }, autoSaveInterval);

  const navigatorPages = pages.map((p) => {
    const current = p.position === page.position;

    let stateOfPage = pageState[p.position];
    if (stateOfPage !== COMPLETE) {
      stateOfPage = current ? IN_PROGRESS : pageState[p.position];
    }

    const state = p.review ? formData[formDataStatusProp] : stateOfPage;
    return {
      label: p.label,
      onNavigation: () => {
        onUpdatePage(p.position);
      },
      state,
      current,
      review: p.review,
    };
  });

  const DraftAlert = () => (
    <DismissingComponentWrapper
      shown={showSavedDraft}
      updateShown={updateShowSavedDraft}
      hideFromScreenReader={false}
    >
      {lastSaveTime && (
      <Alert className="margin-top-3 maxw-mobile-lg" noIcon slim type="success" aria-live="off">
        Draft saved on
        {' '}
        {lastSaveTime.format('MM/DD/YYYY [at] h:mm a z')}
      </Alert>
      )}
    </DismissingComponentWrapper>
  );

  const newLocal = 'smart-hub-sidenav-wrapper no-print';
  return (
    <Grid row gap>
      <Grid className={newLocal} col={12} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          pages={navigatorPages}
          lastSaveTime={lastSaveTime}
          errorMessage={errorMessage}
          savedToStorageTime={savedToStorageTime}
        />
      </Grid>
      <Grid className="smart-hub-navigator-wrapper" col={12} desktop={{ col: 8 }}>
        <SocketAlert store={socketMessageStore} />

        <div id="navigator-form">
          {page.review && page.render(
            formData,
            onFormSubmit,
            additionalData,
            onReview,
            isApprover,
            isPendingApprover,
            onResetToDraft,
            onSave,
            navigatorPages,
            reportCreator,
            lastSaveTime,
            onUpdatePage,
          )}
          {!page.review
            && (
              <Container skipTopPadding>
                <NavigatorHeader
                  key={page.label}
                  label={page.label}
                  titleOverride={page.titleOverride}
                  formData={formData}
                />
                <Form
                  className="smart-hub--form-large smart-hub--form__activity-report-form"
                >
                  {page.render(
                    additionalData,
                    formData,
                    reportId,
                    isAppLoading,
                    onContinue,
                    onSaveDraft,
                    onUpdatePage,
                    weAreAutoSaving,
                    datePickerKey,
                    onFormSubmit,
                    DraftAlert,
                  )}
                </Form>

              </Container>
            )}
        </div>
      </Grid>
    </Grid>
  );
};

Navigator.propTypes = {
  onSaveDraft: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func,
  onResetToDraft: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    calculatedStatus: PropTypes.string,
    pageState: PropTypes.shape({}),
    regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
  errorMessage: PropTypes.string,
  lastSaveTime: PropTypes.instanceOf(moment),
  savedToStorageTime: PropTypes.string,
  onFormSubmit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  isApprover: PropTypes.bool.isRequired,
  isPendingApprover: PropTypes.bool.isRequired,
  updatePage: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      review: PropTypes.bool.isRequired,
      position: PropTypes.number.isRequired,
      path: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentPage: PropTypes.string.isRequired,
  autoSaveInterval: PropTypes.number,
  additionalData: PropTypes.shape({}),
  reportId: PropTypes.node.isRequired,
  reportCreator: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string,
    ]),
  }),
  socketMessageStore: PropTypes.shape({
    user: PropTypes.oneOfType([
      PropTypes.shape({
        name: PropTypes.string,
      }),
      PropTypes.string,
    ]),
  }),
  showSavedDraft: PropTypes.bool,
  updateShowSavedDraft: PropTypes.func.isRequired,
  datePickerKey: PropTypes.string,
  formDataStatusProp: PropTypes.string,
};

Navigator.defaultProps = {
  onSaveAndContinue: null,
  showSavedDraft: false,
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  lastSaveTime: null,
  savedToStorageTime: null,
  errorMessage: '',
  socketMessageStore: null,
  reportCreator: {
    name: null,
    role: null,
  },
  datePickerKey: '',
  formDataStatusProp: 'calculatedStatus',
};

export default Navigator;
