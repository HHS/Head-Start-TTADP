import React from 'react';
import IncompletePages from '../../../../components/IncompletePages';
import { reviewPagePropType } from './constants';

export default function CreatorSubmit({ hasIncompletePages, incompletePages }) {
  return (
    <>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
    </>
  );
}

CreatorSubmit.propTypes = reviewPagePropType;
