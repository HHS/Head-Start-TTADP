/*
  Review items for activity report review section

  These items are for use with the USWDS accordion component. This module is split in the
  following way:

  1. Review Item: this represents a page in the activity report, and contains multiple
     review sections.
  2. Sections: this represents a "fieldset" in the report, or the major sections within a page
     of the activity report, they contain items.
  3. Items: these are the individual form fields for the activity report
*/
import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { HashLink } from 'react-router-hash-link';
import _ from 'lodash';
import React from 'react';

const itemType = {
  label: PropTypes.string.isRequired,
  path: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.shape({}),
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.shape({})),
  ]),
};

const sectionType = {
  title: PropTypes.string.isRequired,
  anchor: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape(itemType)).isRequired,
  basePath: PropTypes.string.isRequired,
};

const Section = ({
  title, items, basePath, anchor,
}) => {
  const isEmpty = !items.some(({ value }) => value && value.length);
  const classes = [
    'smart-hub-review-section',
    isEmpty ? 'smart-hub-review-section--empty no-print' : '',
    'margin-bottom-3',
  ].filter((x) => x).join(' ');

  return (
    <div className={classes}>
      <Grid row className="border-bottom padding-bottom-1 margin-bottom-105">
        <Grid col={6}>
          <b className="margin-y-1">{title}</b>
        </Grid>
        <Grid col={6} className="flex-align-end display-flex flex-column flex-justify-center">
          <HashLink
            aria-label={`Edit form section "${title}"`}
            to={`${basePath}#${anchor}`}
            className="smart-hub-edit-link pull-right no-print"
          >
            Edit
          </HashLink>
        </Grid>
      </Grid>
      {items.map(({ label, value, path }) => (
        <Item key={label} label={label} value={value} path={path} />
      ))}
    </div>
  );
};

Section.propTypes = sectionType;

const Item = ({ label, value, path }) => {
  let values = value;

  if (!Array.isArray(value)) {
    values = [value];
  }

  if (path) {
    values = values.map((v) => _.get(v, path));
  }

  const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');

  return (
    <Grid row className={classes}>
      <Grid col={6}>
        {label}
      </Grid>
      <Grid col={6}>
        {values.map((v, index) => (
          <Grid aria-label={`${label} ${index + 1}`} key={`${label}${v}`} col={12} className="flex-align-end display-flex flex-column flex-justify-center">
            {Number.isNaN(v) ? '' : v}
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
};

Item.propTypes = itemType;

Item.defaultProps = {
  path: '',
  value: null,
};

const ReviewItem = ({ formData, sections, basePath }) => (
  <>
    {sections.map((section) => (
      <Section
        key={section.title}
        basePath={basePath}
        anchor={section.anchor}
        title={section.title}
        items={section.items.map((item) => {
          const { path, label } = item;
          const value = _.get(formData, item.name, '');
          return {
            label,
            value,
            path,
          };
        })}
      />
    ))}
  </>
);

ReviewItem.propTypes = {
  formData: PropTypes.shape({}).isRequired,
  basePath: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      anchor: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(PropTypes.shape(itemType)).isRequired,
    }),
  ).isRequired,
};

/*
  This is the format the USWDS accordion expects of accordion items
*/
export default (id, title, sections, formData) => ({
  id,
  title,
  content: <ReviewItem formData={formData} sections={sections} basePath={id} />,
});
