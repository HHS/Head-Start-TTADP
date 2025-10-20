import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import ObjectiveTitle from './ObjectiveTitle';
import {
  OBJECTIVE_FORM_FIELD_INDEXES,
  OBJECTIVE_ERROR_MESSAGES,
} from './constants';
import AppLoadingContext from '../../AppLoadingContext';
import FormFieldThatIsSometimesReadOnly from './FormFieldThatIsSometimesReadOnly';
import { OBJECTIVE_STATUS } from '../../Constants';

const [objectiveTitleError] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  userCanEdit,
  goalStatus,
}) {
  // the parent objective data from props
  const {
    title,
    status,
    onAR,
  } = objective;

  const { isAppLoading } = useContext(AppLoadingContext);

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });

  // validate different fields
  const validateObjectiveTitle = () => {
    if (!title) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <span className="usa-error-message">{objectiveTitleError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <></>);
      setObjectiveError(index, newErrors);
    }
  };

  return (
    <div className="margin-top-5 ttahub-create-goals-objective-form">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3 className="margin-bottom-0">Objective summary</h3>
        { !onAR && userCanEdit
          && (<Button type="button" unstyled onClick={() => removeObjective(index)} aria-label={`Remove objective ${index + 1}`}>Remove this objective</Button>)}
      </div>

      <FormFieldThatIsSometimesReadOnly
        label="TTA objective"
        permissions={[
          userCanEdit,
          status !== OBJECTIVE_STATUS.COMPLETE,
          status !== OBJECTIVE_STATUS.SUSPENDED,
          !onAR,
          goalStatus !== GOAL_STATUS.CLOSED,
          goalStatus !== GOAL_STATUS.SUSPENDED,
        ]}
        value={title}
      >
        <ObjectiveTitle
          error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE]}
          title={title}
          onChangeTitle={onChangeTitle}
          validateObjectiveTitle={validateObjectiveTitle}
          isLoading={isAppLoading}
          userCanEdit={userCanEdit}
        />
      </FormFieldThatIsSometimesReadOnly>
    </div>
  );
}

ObjectiveForm.propTypes = {
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  setObjective: PropTypes.func.isRequired,
  objective: PropTypes.shape({
    onAR: PropTypes.bool.isRequired,
    onApprovedAR: PropTypes.bool.isRequired,
    closeSuspendReason: PropTypes.string,
    closeSuspendContext: PropTypes.string,
    isNew: PropTypes.bool,
    supportType: PropTypes.string,
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    ids: PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ])),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    files: PropTypes.arrayOf(PropTypes.shape({
      originalFileName: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    status: PropTypes.string,
  }),
  userCanEdit: PropTypes.bool.isRequired,
  goalStatus: PropTypes.string.isRequired,
};

ObjectiveForm.defaultProps = {
  objective: {
    id: '',
    title: '',
    topics: [],
    activityReports: [],
    resources: [],
    files: [],
    status: '',
    supportType: '',
  },
};
