/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox, SiteAlert } from '@trussworks/react-uswds';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../utils';
import './AlertReview.scss';
import Req from '../../../components/Req';
import { saveSiteAlert, createSiteAlert } from '../../../fetchers/Admin';

const BASE_EDITOR_HEIGHT = '10rem';

export default function ReviewAlert({ alert, onDelete }) {
  const [id, setId] = useState(alert.id);
  const [isNew, setIsNew] = useState(alert.isNew);
  const [isEditable, setIsEditable] = useState(alert.isNew);
  const [message, setMessage] = useState(alert.message);
  const [title, setTitle] = useState(alert.title);
  const [startDate, setStartDate] = useState(alert.startDate);
  const [endDate, setEndDate] = useState(alert.endDate);
  const [status, setStatus] = useState(alert.status);
  const [isFetching, setIsFetching] = useState(false);

  let defaultEditorState;
  if (alert.message) {
    defaultEditorState = getEditorState(message);
  }

  const onInternalChange = (currentContentState) => {
    const html = draftToHtml(currentContentState);
    setMessage(html);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const newAlert = {
      startDate,
      endDate,
      message,
      title,
      status,
    };

    if (isNew) {
      try {
        setIsFetching(true);
        await createSiteAlert(newAlert);
        setIsNew(false);
        setIsEditable(false);
        setId(alert.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`There was an error creating an alert:${err}`);
      } finally {
        setIsFetching(false);
      }
    } else {
      try {
        setIsFetching(true);
        await saveSiteAlert(id, newAlert);
        setIsEditable(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`There was an error updating an alert:${err}`);
      } finally {
        setIsFetching(false);
      }
    }
  };

  return (
    <div className="margin-y-3 padding-1 position-relative">
      {alert.message || alert.title ? (
        <SiteAlert
          variant="info"
          showIcon
          heading={title}
          style={{
            minHeight: '6rem', position: 'sticky', top: '71px', zIndex: 2,
          }}
        >
          <>
            <Checkbox
              id={`is-editable-${alert.id}`}
              name={`is-editable-${alert.id}`}
              className="float-right"
              label="Edit?"
              onChange={() => setIsEditable(!isEditable)}
              checked={isEditable}
              aria-label="Edit?"
              disabled={isFetching}
            />
            <div className="usa-alert__text" dangerouslySetInnerHTML={{ __html: message }} />
          </>
        </SiteAlert>
      ) : null }

      { !isEditable && (startDate || endDate)
        ? (
          <div className="display-flex">
            <p className="usa-prose margin-right-3">
              <span className="text-bold">Start date:</span>
              {' '}
              {startDate}
            </p>
            <p className="usa-prose">
              <span className="text-bold">End date:</span>
              {' '}
              {endDate}
            </p>
          </div>
        )
        : null }

      {isEditable ? (
        <form onSubmit={onSubmit} className="maxw-tablet">

          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-title`}>
              Title
              <Req />
            </label>
            <input
              id={`alert-${alert.id}-title`}
              type="text"
              className="usa-input"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isFetching}
              required
            />
          </div>

          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-message`}>
              Message
              <Req />
            </label>

            <Editor
              onBlur={() => {}}
              spellCheck
              defaultEditorState={defaultEditorState}
              onChange={onInternalChange}
              ariaLabel={`alert ${alert.id} message`}
              handlePastedText={() => false}
              tabIndex="0"
              editorStyle={{ border: '1px solid #565c65', minHeight: BASE_EDITOR_HEIGHT }}
            />

          </div>

          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-start-date`}>
              Start date
              <Req />
            </label>
            <input
              id={`alert-${alert.id}-start-date`}
              type="date"
              className="usa-input"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isFetching}
              required
            />

          </div>

          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-end-date`}>
              End date
              <Req />
            </label>
            <input
              id={`alert-${alert.id}-end-date`}
              type="date"
              className="usa-input"
              name="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isFetching}
              required
            />
          </div>
          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-status`}>
              Status
              <Req />
            </label>
            <select
              id={`alert-${alert.id}-status`}
              className="usa-select"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isFetching}
              required
            >
              <option>Draft</option>
              <option>Published</option>
            </select>
          </div>
          <div className="margin-top-2">
            <Button type="submit" disabled={isFetching}>Save changes</Button>
            <Button type="button" disabled={isFetching} onClick={() => onDelete(alert)} secondary>
              Delete
            </Button>
          </div>
        </form>
      ) : null }
    </div>
  );
}

ReviewAlert.propTypes = {
  onDelete: PropTypes.func.isRequired,
  alert: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    isNew: PropTypes.bool,
  }).isRequired,
};
