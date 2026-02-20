import React from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import { lowerCase } from 'lodash';

export default function LogLine({
  authorName,
  communicationDate,
  duration,
  method,
}) {
  return (
    <p className="smart-hub-serif">
      <span className="text-bold">
        {authorName}
      </span>
      {' '}
      communicated
      {' '}
      {method ? (
        <>
          via
          {' '}
          <span className="text-bold">
            {lowerCase(method || '')}
          </span>
          {' '}
        </>
      ) : null}
      { communicationDate ? (
        <>
          on
          {' '}
          <span className="text-bold">
            {format(parseISO(communicationDate), 'MMM do, yyyy')}
          </span>
          {' '}
        </>
      ) : null}
      { duration ? (
        <>
          for
          {' '}
          <span className="text-bold">
            {duration}
          </span>
          {' '}
          hour
          {Number(duration) === 1 ? '' : 's'}
        </>
      ) : null}
      .
    </p>
  );
}

LogLine.propTypes = {
  authorName: PropTypes.string.isRequired,
  communicationDate: PropTypes.string,
  duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  method: PropTypes.string,
};

LogLine.defaultProps = {
  communicationDate: '',
  duration: '',
  method: '',
};
