/* eslint-disable import/prefer-default-export */
import PropTypes from 'prop-types'

const reviewSubmitComponentProps = {
  onSaveDraft: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onFormReview: PropTypes.func.isRequired,
  reviewSubmitPagePosition: PropTypes.number.isRequired,
  isPoc: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      state: PropTypes.string,
      review: PropTypes.bool,
      label: PropTypes.string,
    })
  ).isRequired,
  isAdmin: PropTypes.bool.isRequired,
}

export { reviewSubmitComponentProps }
