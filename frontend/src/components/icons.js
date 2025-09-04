/* eslint-disable max-len */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faExclamationCircle,
  faMinusCircle,
  faTimesCircle,
  faPencil,
  faTrash,
  faUsers,
  faUserGroup,
  faPauseCircle,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

const DEFAULT_ICON_SIZE = '1x';

const Icon = ({
  size,
  color,
  icon,
}) => (
  <FontAwesomeIcon className="margin-right-1 flex-align-self-center" size={size} color={color} icon={icon} />
);

Icon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
  // eslint-disable-next-line react/forbid-prop-types
  icon: PropTypes.object,
};

Icon.defaultProps = {
  size: DEFAULT_ICON_SIZE,
  color: colors.ttahubMediumBlue,
  icon: faClock,
};

const STATUS_ICON_PROP_TYPES = {
  size: PropTypes.string,
};

const STATUS_ICON_PROP_TYPES_DEFAULTS = {
  size: DEFAULT_ICON_SIZE,
};

const InProgress = ({ size }) => <Icon size={size} color={colors.ttahubMediumBlue} icon={faClock} />;
InProgress.propTypes = STATUS_ICON_PROP_TYPES;
InProgress.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const Closed = ({ size }) => <Icon size={size} color={colors.successDarker} icon={faCheckCircle} />;
Closed.propTypes = STATUS_ICON_PROP_TYPES;
Closed.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const NotStarted = ({ size }) => <Icon size={size} color={colors.ttahubOrange} icon={faMinusCircle} />;
NotStarted.propTypes = STATUS_ICON_PROP_TYPES;
NotStarted.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const NoStatus = ({ size }) => <Icon size={size} color={colors.baseLighter} icon={faExclamationCircle} />;
NoStatus.propTypes = STATUS_ICON_PROP_TYPES;
NoStatus.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const Draft = () => <i className="fa-regular fa-pen-circle margin-right-1 flex-align-self-center" style={{ fill: colors.baseDarkest }} />;
const Ceased = ({ size }) => <Icon size={size} color={colors.errorDark} icon={faTimesCircle} />;
Ceased.propTypes = STATUS_ICON_PROP_TYPES;
Ceased.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const Paused = ({ size }) => <Icon size={size} color={colors.errorDark} icon={faPauseCircle} />;
Paused.propTypes = STATUS_ICON_PROP_TYPES;
Paused.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const Pencil = ({ size }) => <Icon size={size} color={colors.ttahubMediumBlue} icon={faPencil} />;
Pencil.propTypes = STATUS_ICON_PROP_TYPES;
Pencil.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const Trash = ({ size }) => <Icon size={size} color={colors.ttahubMediumBlue} icon={faTrash} />;
Trash.propTypes = STATUS_ICON_PROP_TYPES;
Trash.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const PendingApprovalIcon = ({ size }) => <Icon size={size} color={colors.ttahubOrange} icon={faClock} />;
PendingApprovalIcon.propTypes = STATUS_ICON_PROP_TYPES;
PendingApprovalIcon.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const NeedsActionIcon = ({ size }) => <Icon size={size} color={colors.errorDark} icon={faExclamationCircle} />;
NeedsActionIcon.propTypes = STATUS_ICON_PROP_TYPES;
NeedsActionIcon.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const UsersIcon = ({ size }) => <Icon size={size} color={colors.baseDarkest} icon={faUsers} />;
UsersIcon.propTypes = STATUS_ICON_PROP_TYPES;
UsersIcon.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;
const UserGroupIcon = ({ size }) => <Icon size={size} color={colors.baseDarkest} icon={faUserGroup} />;
UserGroupIcon.propTypes = STATUS_ICON_PROP_TYPES;
UserGroupIcon.defaultProps = STATUS_ICON_PROP_TYPES_DEFAULTS;

export {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Ceased,
  Paused,
  Pencil,
  PendingApprovalIcon,
  NeedsActionIcon,
  Trash,
  UsersIcon,
  UserGroupIcon,
};
