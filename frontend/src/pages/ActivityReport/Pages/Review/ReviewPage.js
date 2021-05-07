import React from 'react';
import PropTypes from 'prop-types';
import { some } from 'lodash';
import { useFormContext } from 'react-hook-form/dist/index.ie11';

import Section from './ReviewSection';
import ReviewItem from './ReviewItem';
import { reportIsEditable } from '../../../../utils';

const ReviewPage = ({ sections, path }) => {
  const { getValues } = useFormContext();
  const canEdit = reportIsEditable(getValues('status'));

  return (
    <>
      {sections.map((section) => {
        const names = section.items.map((item) => item.name);
        const values = getValues(names);
        const isEmpty = !some(values, (value) => value && value.length);
        return (
          <Section
            hidePrint={isEmpty}
            key={section.title}
            basePath={path}
            anchor={section.anchor}
            title={section.title}
            canEdit={canEdit}
          >
            {section.items.map((item) => (
              <ReviewItem
                key={item.label}
                label={item.label}
                path={item.path}
                name={item.name}
              />
            ))}
          </Section>
        );
      })}
    </>
  );
};

ReviewPage.propTypes = {
  path: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    anchor: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      path: PropTypes.string,
      name: PropTypes.string,
    })),
  })).isRequired,
};

export default ReviewPage;
