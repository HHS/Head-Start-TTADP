import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import FilterTopicSelect from '../FilterTopicSelect';

const { findByText } = screen;

describe('FilterTopicSelect', () => {
  const renderTopicSelect = (onApply) => (
    render(
      <FilterTopicSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    fetchMock.get('api/topic', [{ id: 58, name: 'Behavioral / Mental Health / Trauma' }, { id: 60, name: 'CLASS: Classroom Organization' }, { id: 61, name: 'CLASS: Emotional Support' }, { id: 62, name: 'CLASS: Instructional Support' }, { id: 63, name: 'Coaching' }, { id: 64, name: 'Communication' }, { id: 65, name: 'Community and Self-Assessment' }, { id: 66, name: 'Culture & Language' }, { id: 67, name: 'Curriculum (Instructional or Parenting)' }, { id: 68, name: 'Data and Evaluation' }, { id: 69, name: 'ERSEA' }, { id: 70, name: 'Environmental Health and Safety / EPRR' }, { id: 72, name: 'Facilities' }, { id: 73, name: 'Family Support Services' }, { id: 74, name: 'Fiscal / Budget' }, { id: 75, name: 'Five-Year Grant' }, { id: 76, name: 'Home Visiting' }, { id: 77, name: 'Human Resources' }, { id: 78, name: 'Leadership / Governance' }, { id: 79, name: 'Learning Environments' }, { id: 80, name: 'Nutrition' }, { id: 81, name: 'Oral Health' }, { id: 82, name: 'Parent and Family Engagement' }, { id: 83, name: 'Partnerships and Community Engagement' }, { id: 84, name: 'Physical Health and Screenings' }, { id: 85, name: 'Pregnancy Services / Expectant Families' }, { id: 86, name: 'Program Planning and Services' }, { id: 87, name: 'Quality Improvement Plan / QIP' }, { id: 88, name: 'Recordkeeping and Reporting' }, { id: 89, name: 'Safety Practices' }, { id: 90, name: 'Staff Wellness' }, { id: 92, name: 'Technology and Information Systems' }, { id: 93, name: 'Transition Practices' }, { id: 94, name: 'Transportation' }, { id: 124, name: 'Child Screening and Assessment' }, { id: 125, name: 'Teaching / Caregiving Practices' }, { id: 126, name: 'Disabilities Services' }, { id: 128, name: 'Training and Professional Development' }, { id: 129, name: 'Fatherhood / Male Caregiving' }, { id: 130, name: 'Ongoing Monitoring and Continuous Improvement' }]);
    const onApply = jest.fn();
    renderTopicSelect(onApply);

    const select = await findByText(/Select topics to filter by/i);
    await selectEvent.select(select, ['Transition Practices']);
    expect(onApply).toHaveBeenCalledWith(['Transition Practices']);
  });
});
