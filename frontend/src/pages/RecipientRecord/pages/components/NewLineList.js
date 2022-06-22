import React from 'react';
import PropTypes from 'prop-types';

export default function NewLineList({ list }) {
  return list.map((item) => (
    <React.Fragment key={item}>
      <span>{item}</span>
      <br />
    </React.Fragment>
  ));
}

NewLineList.propTypes = {
  list: PropTypes.arrayOf(PropTypes.string).isRequired,
};
