import PropTypes from 'prop-types';

const approver = PropTypes.shape({
  note: PropTypes.string,
  status: PropTypes.string,
});

const reviewPagePropType = {
  hasIncompletePages: PropTypes.bool.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
  isCreator: PropTypes.bool.isRequired,
  isCollaborator: PropTypes.bool.isRequired,
  isSubmitted: PropTypes.bool.isRequired,
  onFormReview: PropTypes.func.isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  dateSubmitted: PropTypes.string,
  otherManagerNotes: PropTypes.arrayOf(approver),
  onSaveDraft: PropTypes.func.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
};

const reviewPageDefaultProps = {
  dateSubmitted: null,
};

export { reviewPagePropType, reviewPageDefaultProps };
