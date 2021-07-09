/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';

import topics from '../topicsResources';

// eslint-disable-next-line react/prop-types
const RenderTopicsResourcesReview = ({ data }) => {
  const history = createMemoryHistory();
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: data,
  });
  // eslint-disable-next-line react/prop-types
  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        {topics.reviewSection()}
      </FormProvider>
    </Router>
  );
};

const RenderTopicsResources = () => {
  const history = createMemoryHistory();
  const hookForm = useForm({
    mode: 'onChange',
  });
  // eslint-disable-next-line react/prop-types
  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        {topics.render()}
      </FormProvider>
    </Router>
  );
};

describe('Topics & resources', () => {
  const data = {
    attachments: [{ originalFileName: 'attachment', url: { url: 'http://localhost/attachment' }, status: 'APPROVED' }],
    ECLKCResourcesUsed: [{ value: 'eclkc' }],
    nonECLKCResourcesUsed: [{ value: 'nonEclkc' }],
    topics: 'topics',
  };

  describe('review page', () => {
    it('displays attachments and other resources', async () => {
      render(<RenderTopicsResourcesReview data={data} />);
      expect(await screen.findByText('eclkc')).toBeVisible();
      expect(await screen.findByText('attachment')).toBeVisible();
      expect(await screen.findByText('nonEclkc')).toBeVisible();
      expect(await screen.findByText('topics')).toBeVisible();
    });
  });

  describe('edit topics page', () => {
    it('displays correct topics', async () => {
      render(<RenderTopicsResources reportId={1} />);
      const topicsSelectBtn = screen.getByText(/topic\(s\) covered\. you may choose more than one\./i);
      userEvent.click(topicsSelectBtn);
      const topicSelect = screen.getByText(/select is focused ,type to refine list, press down to open the menu, press left to focus selected values/i);
      fireEvent.focus(topicSelect);
      fireEvent.keyDown(topicSelect, { key: 'ArrowDown', code: 40 });
      expect(await screen.findByText('Behavioral / Mental Health / Trauma')).toBeVisible();
      expect(await screen.findByText('Child Assessment, Development, Screening')).toBeVisible();
      expect(await screen.findByText('CLASS: Classroom Organization')).toBeVisible();
      expect(await screen.findByText('CLASS: Emotional Support')).toBeVisible();
      expect(await screen.findByText('CLASS: Instructional Support')).toBeVisible();
      expect(await screen.findByText('Coaching')).toBeVisible();
      expect(await screen.findByText('Communication')).toBeVisible();
      expect(await screen.findByText('Community and Self-Assessment')).toBeVisible();
      expect(await screen.findByText('Culture & Language')).toBeVisible();
      expect(await screen.findByText('Curriculum (Instructional or Parenting)')).toBeVisible();
      expect(await screen.findByText('Data and Evaluation')).toBeVisible();
      expect(await screen.findByText('ERSEA')).toBeVisible();
      expect(await screen.findByText('Environmental Health and Safety / EPRR')).toBeVisible();
      expect(await screen.findByText('Equity')).toBeVisible();
      expect(await screen.findByText('Facilities')).toBeVisible();
      expect(await screen.findByText('Family Support Services')).toBeVisible();
      expect(await screen.findByText('Fiscal / Budget')).toBeVisible();
      expect(await screen.findByText('Five-Year Grant')).toBeVisible();
      expect(await screen.findByText('Home Visiting')).toBeVisible();
      expect(await screen.findByText('Human Resources')).toBeVisible();
      expect(await screen.findByText('Leadership / Governance')).toBeVisible();
      expect(await screen.findByText('Learning Environments')).toBeVisible();
      expect(await screen.findByText('Nutrition')).toBeVisible();
      expect(await screen.findByText('Oral Health')).toBeVisible();
      expect(await screen.findByText('Parent and Family Engagement')).toBeVisible();
      expect(await screen.findByText('Partnerships and Community Engagement')).toBeVisible();
      expect(await screen.findByText('Physical Health and Screenings')).toBeVisible();
      expect(await screen.findByText('Pregnancy Services / Expectant Families')).toBeVisible();
      expect(await screen.findByText('Program Planning and Services')).toBeVisible();
      expect(await screen.findByText('Quality Improvement Plan / QIP')).toBeVisible();
      expect(await screen.findByText('Recordkeeping and Reporting')).toBeVisible();
      expect(await screen.findByText('Safety Practices')).toBeVisible();
      expect(await screen.findByText('Staff Wellness')).toBeVisible();
      expect(await screen.findByText('Teaching Practices / Teacher-Child Interactions')).toBeVisible();
      expect(await screen.findByText('Technology and Information Systems')).toBeVisible();
      expect(await screen.findByText('Transition Practices')).toBeVisible();
      expect(await screen.findByText('Transportation')).toBeVisible();
    });
  });
});
