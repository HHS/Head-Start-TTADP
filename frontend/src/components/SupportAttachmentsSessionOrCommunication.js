import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Helmet } from 'react-helmet';
import {
  ErrorMessage,
  Fieldset,
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import ReportFileUploader from './FileUploader/ReportFileUploader';
import useCompleteSectionOnVisit from '../hooks/useCompleteSectionOnVisit';

const SupportingAttachmentsSessionOrCommunication = ({
  reportId,
  visitedFieldName,
  handleDelete,
  idKey,
}) => {
  const [fileError, setFileError] = useState();
  const { register } = useFormContext();

  useCompleteSectionOnVisit(visitedFieldName);

  return (
    <>
      <Helmet>
        <title>Supporting Attachments</title>
      </Helmet>
      <input type="hidden" ref={register()} name={visitedFieldName} />
      <Fieldset className="smart-hub--report-legend margin-top-4">
        <FormGroup error={fileError}>
          <div id="attachments" />
          <Label className="margin-top-0" htmlFor="files">
            Upload any relevant attachments, such as:
            <ul className="margin-top-0 padding-left-4">
              <li>meetings agendas</li>
              <li>services plans</li>
              <li>sign-in or attendance sheets</li>
              <li>other items not available online</li>
              <li>other non-resource items not available online</li>
            </ul>
          </Label>

          <span className="usa-hint font-sans-3xs">Example: .doc, .pdf, .txt, .csv (max size 30 MB)</span>
          { fileError && (<ErrorMessage>{fileError}</ErrorMessage>)}
          <Controller
            name="files"
            defaultValue={[]}
            render={({ onChange, value }) => (
              <ReportFileUploader
                setErrorMessage={setFileError}
                files={value}
                onChange={onChange}
                id="files"
                idKey={idKey}
                idValue={reportId}
                deleteFile={handleDelete}
              />
            )}
          />
        </FormGroup>
      </Fieldset>
    </>
  );
};

SupportingAttachmentsSessionOrCommunication.propTypes = {
  reportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  visitedFieldName: PropTypes.string.isRequired,
  handleDelete: PropTypes.func.isRequired,
  idKey: PropTypes.string.isRequired,
};

export default SupportingAttachmentsSessionOrCommunication;
