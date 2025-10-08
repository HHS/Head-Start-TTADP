/* eslint-disable import/prefer-default-export */
import PropTypes from 'prop-types';

const reviewSubmitComponentProps = {
  onSaveDraft: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  reviewSubmitPagePosition: PropTypes.number.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
};

export {
  reviewSubmitComponentProps,
};
