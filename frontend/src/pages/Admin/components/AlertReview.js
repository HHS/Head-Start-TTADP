/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  Button,
  Checkbox,
  DatePicker,
  Alert,
} from '@trussworks/react-uswds';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../utils';
import SiteAlert from '../../../components/SiteAlert';
import Req from '../../../components/Req';
import { saveSiteAlert, createSiteAlert } from '../../../fetchers/Admin';
import ReadOnlyEditor from '../../../components/ReadOnlyEditor';
import { ALERT_STATUSES, ALERT_VARIANTS } from '../../../Constants';
import './AlertReview.scss';

const BASE_EDITOR_HEIGHT = '10rem';

export default function AlertReview({ alert, onDelete }) {
  const [id, setId] = useState(alert.id);
  const [notification, setNotification] = useState(null);
  const [isNew, setIsNew] = useState(alert.isNew);
  const [isEditable, setIsEditable] = useState(alert.isNew);
  const [message, setMessage] = useState(alert.message);
  const [title, setTitle] = useState(alert.title);
  const [variant, setVariant] = useState(alert.variant);
  const [startDate, setStartDate] = useState(alert.startDate);
  const [endDate, setEndDate] = useState(alert.endDate);
  const [status, setStatus] = useState(alert.status);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(71);

  useEffect(() => {
    if (isEditable) {
      const header = document.querySelector('.smart-hub-header.has-alerts');
      if (header) {
        const headerHeight = header.offsetHeight;
        setOffset(headerHeight);
      }
    }
  }, [isEditable]);

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
    setNotification(null);

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
        const createdAlert = await createSiteAlert(newAlert);
        setIsNew(false);
        setIsEditable(false);
        setId(createdAlert.id);
        setNotification({
          state: 'success',
          message: 'Your alert was created successfully',
        });
      } catch (err) {
        setNotification({
          state: 'error',
          message: 'There was an error creating this alert.',
        });
      } finally {
        setIsFetching(false);
      }
    } else {
      try {
        setIsFetching(true);
        await saveSiteAlert({ id, ...newAlert });
        setIsEditable(false);
        setNotification({
          state: 'success',
          message: 'Your alert was saved successfully',
        });
      } catch (err) {
        setNotification({
          state: 'error',
          message: 'There was an error updating this alert.',
        });
      } finally {
        setIsFetching(false);
      }
    }
  };

  return (
    <div className="margin-y-3 padding-2 position-relative shadow-2 radius-md">
      {alert.message || alert.title ? (
        <SiteAlert
          heading={title}
          className="z-index-100"
          style={{
            minHeight: '3rem',
            position: isEditable ? 'sticky' : 'relative',
            top: isEditable ? `${offset}px` : 'auto',
            zIndex: 2,
          }}
          variant={variant}
        >
          <ReadOnlyEditor key={message} value={message} ariaLabel={`message for alert ${alert.id}`} />
        </SiteAlert>
      ) : null }

      <div
        className="desktop:display-flex position-relative maxw-desktop margin-x-auto ttahub-date-indicator"
        style={{
          paddingLeft: '4.75rem',
        }}
      >
        { !isEditable && (startDate || endDate) ? (
          <>
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

          </>
        )
          : null }
        <Checkbox
          id={`is-editable-${alert.id}`}
          name={`is-editable-${alert.id}`}
          className="position-absolute right-0 top-0 margin-top-2 margin-right-1"
          label="Edit?"
          onChange={() => {
            setIsEditable(!isEditable);
            setNotification(null);
          }}
          checked={isEditable}
          aria-label="Edit?"
          disabled={isFetching}
        />
      </div>

      {isEditable ? (
        <form onSubmit={onSubmit} className="maxw-tablet smart-hub-admin__create-alert-form">

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
            <label htmlFor={`alert-${alert.id}-variant`}>
              Varian
              <Req />
            </label>
            <select
              id={`alert-${alert.id}-variant`}
              className="usa-select"
              name={`alert-${alert.id}-variant`}
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              disabled={isFetching}
              required
            >
              {Object.values(ALERT_VARIANTS).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
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
            <DatePicker
              id={`alert-${alert.id}-start-date`}
              name={`alert-${alert.id}-start-date`}
              defaultValue={moment(startDate, 'MM/DD/YYYY').format('YYYY-MM-DD')}
              onChange={(date) => setStartDate(date)}
              disabled={isFetching}
              required
            />
          </div>

          <div className="margin-top-3">
            <label htmlFor={`alert-${alert.id}-end-date`}>
              End date
              <Req />
            </label>
            <DatePicker
              id={`alert-${alert.id}-end-date`}
              name={`alert-${alert.id}-end-date`}
              defaultValue={moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')}
              onChange={(date) => setEndDate(date)}
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
              name={`alert-${alert.id}-status`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isFetching}
              required
            >
              {Object.values(ALERT_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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
      { notification && notification.message && notification.state ? (
        <div className="margin-top-3">
          <Alert type={notification.state} slim>
            <div className="usa-alert__body">
              <p className="usa-alert__text">
                {notification.message}
              </p>
            </div>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}

AlertReview.propTypes = {
  onDelete: PropTypes.func.isRequired,
  alert: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    isNew: PropTypes.bool,
    variant: PropTypes.string,
  }).isRequired,
};
