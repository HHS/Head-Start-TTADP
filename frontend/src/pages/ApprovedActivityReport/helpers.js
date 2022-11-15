import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../../utils';

function renderEditor(heading, data) {
  /**
   * sometimes, we may receive JSX
   */
  if (typeof data === 'object') {
    return data;
  }

  let wrapperId = '';

  if (typeof heading === 'string') {
    wrapperId = `${heading.toLowerCase().replace(' ', '-')}-${uuidv4()}`;
  } else {
    wrapperId = uuidv4();
  }

  /**
   * otherwise, we render the contents via react-draft
   */
  const defaultEditorState = getEditorState(data || '');

  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={defaultEditorState}
      wrapperId={wrapperId}
    />
  );
}

export function renderData(heading, data) {
  if (Array.isArray(data)) {
    const cleanData = data.filter((d) => d);
    return (
      <ul>
        {cleanData.map((line) => <li key={uuidv4()} className="margin-bottom-1">{renderEditor(heading, line)}</li>)}
      </ul>
    );
  }

  return renderEditor(heading, data);
}

export function formatSimpleArray(arr) {
  return arr.sort().join(', ');
}

export function mapAttachments(attachments) {
  if (Array.isArray(attachments) && attachments.length > 0) {
    return (
      <ul>
        {
            attachments.map((attachment) => (
              <li key={attachment.url.url}>
                <a
                  href={attachment.url.url}
                  target={attachment.originalFileName.endsWith('.txt') ? '_blank' : '_self'}
                  rel="noreferrer"
                >
                  {
                    `${attachment.originalFileName}
                     ${attachment.originalFileName.endsWith('.txt')
                      ? ' (opens in new tab)'
                      : ''}`
                  }
                </a>
              </li>
            ))
          }
      </ul>
    );
  }

  return [];
}

export function formatRequester(requester) {
  if (requester === 'recipient') {
    return 'Recipient';
  }

  if (requester === 'regionalOffice') {
    return 'Regional Office';
  }

  return '';
}

export const reportDataPropTypes = {
  data: PropTypes.shape({
    activityRecipientType: PropTypes.string,
    activityRecipients: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
    })),
    targetPopulations: PropTypes.arrayOf(PropTypes.string),
    approvers: PropTypes.arrayOf(PropTypes.shape({
      User: PropTypes.shape({
        fullName: PropTypes.string,
      }),
    })),
    activityReportCollaborators: PropTypes.arrayOf(PropTypes.shape({
      User: PropTypes.shape({
        fullName: PropTypes.string,
        note: PropTypes.string,
      }),
    })),
    author: PropTypes.shape({
      fullName: PropTypes.string,
      note: PropTypes.string,
    }),
    participants: PropTypes.arrayOf(PropTypes.string),
    numberOfParticipants: PropTypes.number,
    reason: PropTypes.arrayOf(PropTypes.string),
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    duration: PropTypes.string,
    ttaType: PropTypes.arrayOf(PropTypes.string),
    virtualDeliveryType: PropTypes.string,
    deliveryMethod: PropTypes.string,
    requester: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.string),
    ECLKCResourcesUsed: PropTypes.arrayOf(PropTypes.string),
    nonECLKCResourcesUsed: PropTypes.arrayOf(PropTypes.string),
    files: PropTypes.arrayOf(PropTypes.shape({
      url: PropTypes.shape({ url: PropTypes.string }),
      originalFileName: PropTypes.string,
    })),
    specialistNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
    })),
    recipientNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
    })),
    context: PropTypes.string,
    displayId: PropTypes.string,
    additionalNotes: PropTypes.string,
    approvedAt: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
};
