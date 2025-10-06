import PropTypes from 'prop-types';

const reviewSubmitComponentProps = {
  onSaveDraft: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const REVIEW_SUBMIT_POSITION = 5;

export {
  reviewSubmitComponentProps,
  REVIEW_SUBMIT_POSITION,
};
