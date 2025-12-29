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
  children,
  formName,
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
      <Fieldset className="smart-hub--report-legend">
        <FormGroup error={fileError} className="margin-top-0">
          <div id="attachments" />
          {children}
          <span className="usa-hint font-sans-3xs">
            File types accepted:
            images, .pdf, .docx, .xlsx, .pptx, .doc, .xls, .ppt, .zip, .txt, .csv (max size 30 MB)
          </span>
          { fileError && (<ErrorMessage>{fileError}</ErrorMessage>)}
          <Controller
            name={formName}
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
  children: PropTypes.node,
  formName: PropTypes.string,
};

SupportingAttachmentsSessionOrCommunication.defaultProps = {
  formName: 'files',
};

SupportingAttachmentsSessionOrCommunication.defaultProps = {
  children: (<Label className="margin-top-0" htmlFor="files">
    Upload any relevant attachments, such as:
    <ul className="margin-top-0 padding-left-4">
      <li>meetings agendas</li>
      <li>services plans</li>
      <li>sign-in or attendance sheets</li>
      <li>other items not available online</li>
      <li>other non-resource items not available online</li>
    </ul>
    {/* eslint-disable-next-line react/jsx-closing-tag-location */}
  </Label>),
};

export default SupportingAttachmentsSessionOrCommunication;
