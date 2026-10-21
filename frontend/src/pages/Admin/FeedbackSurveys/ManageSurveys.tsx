import { Alert, Button, ModalFooter, ModalToggleButton } from '@trussworks/react-uswds';
import type { ModalRef } from '@trussworks/react-uswds';
import React, { useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import VanillaModal from '../../../components/VanillaModal';
import { closeFeedbackSurveyDefinition, getFeedbackSurveyDefinitions } from '../../../fetchers/Admin';
import useFetch from '../../../hooks/useFetch';
import ReopenSurveyForm from './components/ReopenSurveyForm';
import SurveyTable from './components/SurveyTable';
import type { SurveyDefinition, SurveyDefinitionList } from './types';
import { apiErrorMessage, pageLabel } from './utils';

const EMPTY_LIST: SurveyDefinitionList = { active: [], closed: [], pages: {} };

interface LocationState {
  message?: string;
}

export default function ManageSurveys(): React.ReactElement {
  const history = useHistory<LocationState>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState(history.location.state?.message || '');
  const [actionError, setActionError] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDefinition | null>(null);
  const closeModalRef = useRef<ModalRef>(null);
  const reopenModalRef = useRef<ModalRef>(null);

  const { data, error, loading } = useFetch(
    EMPTY_LIST,
    getFeedbackSurveyDefinitions,
    [refreshKey],
    'There was an error fetching feedback surveys.'
  );
  const { active, closed, pages } = data as SurveyDefinitionList;

  const refresh = (newMessage: string) => {
    setMessage(newMessage);
    setActionError('');
    setRefreshKey((key) => key + 1);
  };

  const openCloseModal = (survey: SurveyDefinition) => {
    setSelectedSurvey(survey);
    closeModalRef.current?.toggleModal(undefined, true);
  };

  const openReopenModal = (survey: SurveyDefinition) => {
    setSelectedSurvey(survey);
    reopenModalRef.current?.toggleModal(undefined, true);
  };

  const onConfirmClose = async () => {
    if (!selectedSurvey) return;
    try {
      await closeFeedbackSurveyDefinition(selectedSurvey.id);
      closeModalRef.current?.toggleModal(undefined, false);
      refresh(`Survey for ${pageLabel(pages, selectedSurvey.pageId)} closed`);
    } catch (err) {
      closeModalRef.current?.toggleModal(undefined, false);
      setActionError(apiErrorMessage(err, 'There was an error closing the survey.'));
    }
  };

  return (
    <>
      <header className="display-flex flex-align-center flex-justify flex-wrap">
        <h2 className="margin-y-2">Manage surveys</h2>
        <Link to="/admin/feedback-surveys/manage/new" className="usa-button">
          <i className="fa-regular fa-circle-plus margin-right-1" aria-hidden="true" />
          Create new survey
        </Link>
      </header>
      <p className="usa-hint margin-top-0">
        Each page can show one survey at a time. A survey asks one question, answered with Yes or No and an optional comment.
        Active surveys close automatically the night after their end date, unless they are set to close manually.
      </p>

      {message && (
        <Alert type="success" slim headingLevel="h3" className="margin-bottom-2">
          {message}
        </Alert>
      )}
      {(error || actionError) && (
        <Alert type="error" slim headingLevel="h3" className="margin-bottom-2">
          {actionError || error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <SurveyTable
            caption="Active surveys"
            surveys={active}
            pages={pages}
            emptyMessage="There are no active or scheduled surveys."
            actionLabel="Close"
            onAction={openCloseModal}
          />
          <SurveyTable
            caption="Closed surveys"
            surveys={closed}
            pages={pages}
            emptyMessage="There are no closed surveys."
            actionLabel="Reopen"
            onAction={openReopenModal}
            showClosedOn
          />
        </>
      )}

      <VanillaModal modalRef={closeModalRef} heading="Are you sure you want to close this survey?" id="close-feedback-survey">
        <p>
          Users will no longer see this survey
          {selectedSurvey ? ` on ${pageLabel(pages, selectedSurvey.pageId)}` : ''}. You can reopen it later.
        </p>
        <ModalFooter>
          <Button type="button" secondary className="margin-right-1" onClick={onConfirmClose}>
            Close survey
          </Button>
          <ModalToggleButton modalRef={closeModalRef} closer unstyled className="padding-105 text-center">
            Cancel
          </ModalToggleButton>
        </ModalFooter>
      </VanillaModal>

      <VanillaModal modalRef={reopenModalRef} heading="Reopen survey" id="reopen-feedback-survey">
        {selectedSurvey ? (
          <ReopenSurveyForm
            key={selectedSurvey.id}
            survey={selectedSurvey}
            modalRef={reopenModalRef}
            onReopened={() => refresh(`Survey for ${pageLabel(pages, selectedSurvey.pageId)} reopened`)}
          />
        ) : (
          <span />
        )}
      </VanillaModal>
    </>
  );
}
