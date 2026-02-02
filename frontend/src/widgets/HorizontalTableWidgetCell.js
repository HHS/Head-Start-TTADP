import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import TextTrim from '../components/TextTrim';

export default function HorizontalTableWidgetCell({
  data,
  showDashForNullValue,
  isFirstColumn = false,
  enableCheckboxes = false,
  hideFirstColumnBorder = false,
  stickyFirstColumn = false,
}) {
  const handleUrl = (url) => {
    if (url.isInternalLink) {
      return (
        <Link to={url.link} className="text-overflow-ellipsis">
          {url.heading || url.value}
        </Link>
      );
    }
    return (
      <>
        <a href={url.link} target="_self" rel="noreferrer" className="text-overflow-ellipsis">
          {url.heading || url.value}
        </a>
        {' '}
        {!url.hideLinkIcon && (
          <FontAwesomeIcon
            color={colors.ttahubBlue}
            icon={faArrowUpRightFromSquare}
            size="xs"
          />
        )}
      </>
    );
  };

  const getCellContent = () => {
    if (data.isUrl) {
      return handleUrl(data);
    }

    if (data.tooltip) {
      return <TextTrim text={data.tooltip ? (data.heading || data.value || '') : data.value} />;
    }

    if (!isFirstColumn && showDashForNullValue && !data.value) {
      return '-';
    }

    if (isFirstColumn && showDashForNullValue && !data.heading) {
      return '-';
    }

    return isFirstColumn ? data.heading : data.value;
  };

  const getFirstColumnClasses = () => {
    if (!isFirstColumn) return 'position-relative';

    const classes = ['smarthub-horizontal-table-first-column', 'text-overflow-ellipsis', 'data-description', 'position-relative'];
    if (stickyFirstColumn) {
      classes.push('smarthub-horizontal-table--sticky-first-column');
    }

    if (stickyFirstColumn && enableCheckboxes) {
      classes.push('smarthub-horizontal-table--sticky-first-column-checkboxes-enabled');
    }

    if (stickyFirstColumn || !hideFirstColumnBorder) {
      classes.push('smarthub-horizontal-table-first-column-border');
    }

    if (enableCheckboxes) {
      classes.push('left-with-checkbox');
    } else {
      classes.push('left-0');
    }

    return classes.join(' ');
  };

  return (
    <td
      data-label={data.title}
      className={getFirstColumnClasses()}
    >
      {getCellContent()}
      {data.suffixContent && (
        <span className="margin-left-2">
          {data.suffixContent}
        </span>
      )}
    </td>
  );
}

HorizontalTableWidgetCell.propTypes = {
  data: PropTypes.shape({
    isUrl: PropTypes.bool,
    isInternalLink: PropTypes.bool,
    link: PropTypes.string,
    tooltip: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.bool]),
    heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    title: PropTypes.string,
    suffixContent: PropTypes.node,
    hideLinkIcon: PropTypes.bool,
  }).isRequired,
  showDashForNullValue: PropTypes.bool,
  isFirstColumn: PropTypes.bool,
  enableCheckboxes: PropTypes.bool,
  hideFirstColumnBorder: PropTypes.bool,
  stickyFirstColumn: PropTypes.bool,
};

HorizontalTableWidgetCell.defaultProps = {
  showDashForNullValue: false,
  isFirstColumn: false,
  enableCheckboxes: false,
  hideFirstColumnBorder: false,
  stickyFirstColumn: false,
};
