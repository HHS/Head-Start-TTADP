import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faExclamationCircle,
  faMinusCircle,
  faTimesCircle,
  faPencil,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { faPenCircle } from '@fortawesome/pro-solid-svg-icons';
import colors from '../colors';

const InProgress = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.ttahubMediumBlue} icon={faClock} />;
const Closed = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.successDarker} icon={faCheckCircle} />;
const NotStarted = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.ttahubOrange} icon={faMinusCircle} />;
const NoStatus = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.baseLighter} icon={faExclamationCircle} />;
const Draft = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.baseDarkest} icon={faPenCircle} />;
const Ceased = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.errorDark} icon={faTimesCircle} />;
const Pencil = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.ttahubMediumBlue} icon={faPencil} />;
const Trash = () => <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size="1x" color={colors.ttahubMediumBlue} icon={faTrash} />;

export {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Ceased,
  Pencil,
  Trash,
};
