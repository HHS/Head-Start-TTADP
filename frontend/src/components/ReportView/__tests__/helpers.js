import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import {
  renderData,
  formatSimpleArray,
  mapAttachments,
  formatRequester,
  formatNextSteps,
  formatObjectiveLinks,
  formatDelivery,
  formatTtaType,
  addObjectiveSectionsToArray,
  getResponses,
  calculateGoalsAndObjectives,
} from '../helpers';
import { OBJECTIVE_STATUS } from '../../../Constants';

describe('helpers', () => {
  describe('renderData', () => {
    it('renders an array of data as a list', () => {
      const heading = 'Test Heading';
      const data = ['Item 1', 'Item 2', 'Item 3'];

      render(<div>{renderData(heading, data)}</div>);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('filters out falsy values from array', () => {
      const heading = 'Test Heading';
      const data = ['Item 1', null, '', 'Item 2', undefined];

      render(<div>{renderData(heading, data)}</div>);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(Array.from(document.querySelectorAll('li'))).toHaveLength(2);
    });

    it('renders non-array data directly via renderEditor', () => {
      const heading = 'Test Heading';
      const data = 'Test content';

      render(<div>{renderData(heading, data)}</div>);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('returns JSX objects as-is', () => {
      const heading = 'Test Heading';
      const data = <span>JSX Content</span>;

      render(<div>{renderData(heading, data)}</div>);

      expect(screen.getByText('JSX Content')).toBeInTheDocument();
    });
  });

  describe('formatSimpleArray', () => {
    it('sorts and joins array elements with commas', () => {
      const arr = ['zebra', 'apple', 'banana'];
      const result = formatSimpleArray(arr);
      expect(result).toBe('apple, banana, zebra');
    });

    it('handles empty array', () => {
      const arr = [];
      const result = formatSimpleArray(arr);
      expect(result).toBe('');
    });

    it('handles null/undefined', () => {
      expect(formatSimpleArray(null)).toBe('');
      expect(formatSimpleArray(undefined)).toBe('');
    });

    it('handles single item array', () => {
      const arr = ['single'];
      const result = formatSimpleArray(arr);
      expect(result).toBe('single');
    });
  });

  describe('mapAttachments', () => {
    const mockAttachments = [
      {
        url: { url: 'http://example.com/file1.pdf' },
        originalFileName: 'document1.pdf',
      },
      {
        url: { url: 'http://example.com/file2.txt' },
        originalFileName: 'notes.txt',
      },
    ];

    it('renders attachments as a list of links', () => {
      render(<div>{mapAttachments(mockAttachments)}</div>);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /document1.pdf/ })).toHaveAttribute('href', 'http://example.com/file1.pdf');
      expect(screen.getByRole('link', { name: /notes.txt/ })).toHaveAttribute('href', 'http://example.com/file2.txt');
    });

    it('opens txt files in new tab', () => {
      render(<div>{mapAttachments(mockAttachments)}</div>);

      const txtLink = screen.getByRole('link', { name: /notes.txt \(opens in new tab\)/ });
      expect(txtLink).toHaveAttribute('target', '_blank');
      expect(txtLink).toHaveAttribute('rel', 'noreferrer');
    });

    it('opens non-txt files in same tab', () => {
      render(<div>{mapAttachments(mockAttachments)}</div>);

      const pdfLink = screen.getByRole('link', { name: 'document1.pdf' });
      expect(pdfLink).toHaveAttribute('target', '_self');
    });

    it('returns "None provided" for empty array', () => {
      const result = mapAttachments([]);
      expect(result).toBe('None provided');
    });

    it('returns "None provided" for non-array', () => {
      const result = mapAttachments(null);
      expect(result).toBe('None provided');
    });
  });

  describe('formatRequester', () => {
    it('returns "Recipient" for recipient', () => {
      expect(formatRequester('recipient')).toBe('Recipient');
    });

    it('returns "Regional Office" for regionalOffice', () => {
      expect(formatRequester('regionalOffice')).toBe('Regional Office');
    });

    it('returns empty string for unknown values', () => {
      expect(formatRequester('unknown')).toBe('');
      expect(formatRequester('')).toBe('');
      expect(formatRequester(null)).toBe('');
    });
  });

  describe('formatNextSteps', () => {
    const mockNextSteps = [
      { note: 'First step', completeDate: '2023-01-01' },
      { note: 'Second step', completeDate: '2023-02-01' },
    ];

    it('formats next steps with proper structure', () => {
      const result = formatNextSteps(mockNextSteps, 'Test Heading');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        heading: 'Test Heading',
        data: {
          'Step 1': 'First step',
          'Anticipated completion': '2023-01-01',
        },
        striped: false,
      });
      expect(result[1]).toEqual({
        heading: '',
        data: {
          'Step 2': 'Second step',
          'Anticipated completion': '2023-02-01',
        },
        striped: false,
      });
    });

    it('handles empty array', () => {
      const result = formatNextSteps([], 'Test Heading');
      expect(result).toEqual([]);
    });
  });

  describe('formatObjectiveLinks', () => {
    const mockResources = [
      { value: 'http://example.com/resource1' },
      { value: 'http://example.com/resource2' },
    ];

    const mockOtherEntityResources = [
      { url: 'http://example.com/other1' },
      { url: 'http://example.com/other2' },
    ];

    it('renders regular resources as links', () => {
      render(<div>{formatObjectiveLinks(mockResources)}</div>);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'http://example.com/resource1' })).toHaveAttribute('href', 'http://example.com/resource1');
      expect(screen.getByRole('link', { name: 'http://example.com/resource2' })).toHaveAttribute('href', 'http://example.com/resource2');
    });

    it('renders other entity resources using url property', () => {
      render(<div>{formatObjectiveLinks(mockOtherEntityResources, true)}</div>);

      expect(screen.getByRole('link', { name: 'http://example.com/other1' })).toHaveAttribute('href', 'http://example.com/other1');
      expect(screen.getByRole('link', { name: 'http://example.com/other2' })).toHaveAttribute('href', 'http://example.com/other2');
    });

    it('returns "None provided" for empty array', () => {
      const result = formatObjectiveLinks([]);
      expect(result).toBe('None provided');
    });

    it('returns "None provided" for non-array', () => {
      const result = formatObjectiveLinks(null);
      expect(result).toBe('None provided');
    });
  });

  describe('formatDelivery', () => {
    it('returns "In Person" for in-person method', () => {
      expect(formatDelivery('in-person')).toBe('In Person');
    });

    it('returns "Virtual" for virtual method without type', () => {
      expect(formatDelivery('virtual')).toBe('Virtual');
    });

    it('returns "Virtual: [type]" for virtual method with type', () => {
      expect(formatDelivery('virtual', 'Zoom')).toBe('Virtual: Zoom');
    });

    it('returns "Hybrid" for hybrid method', () => {
      expect(formatDelivery('hybrid')).toBe('Hybrid');
    });

    it('returns empty string for unknown method', () => {
      expect(formatDelivery('unknown')).toBe('');
      expect(formatDelivery('')).toBe('');
      expect(formatDelivery(null)).toBe('');
    });
  });

  describe('formatTtaType', () => {
    it('formats single TTA type', () => {
      const result = formatTtaType(['training']);
      expect(result).toBe('Training');
    });

    it('formats multiple TTA types', () => {
      const result = formatTtaType(['training', 'technical-assistance']);
      expect(result).toBe('Training, Technical assistance');
    });

    it('handles empty array', () => {
      const result = formatTtaType([]);
      expect(result).toBe('');
    });
  });

  describe('addObjectiveSectionsToArray', () => {
    const mockObjectives = [
      {
        title: 'Test Objective 1',
        citations: [],
        topics: [{ name: 'Topic 1' }, { name: 'Topic 2' }],
        courses: [{ name: 'Course 1' }],
        resources: [{ value: 'http://resource1.com' }],
        files: [],
        ttaProvided: 'Training provided',
        supportType: 'Planning',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      },
    ];

    const mockActivityRecipients = [{ name: 'Recipient 1' }];

    it('adds objective sections to the array', () => {
      const sections = [];
      addObjectiveSectionsToArray(mockObjectives, sections, mockActivityRecipients);

      expect(sections).toHaveLength(1);
      expect(sections[0]).toEqual({
        heading: 'Objective summary',
        headingLevel: 4,
        data: {
          'TTA objective': 'Test Objective 1',
          Topics: 'Topic 1, Topic 2',
          'iPD courses': 'Course 1',
          'Resource links': expect.any(Object),
          'Resource attachments': 'None provided',
          'TTA provided': 'Training provided',
          'Support type': 'Planning',
          'Objective status': OBJECTIVE_STATUS.IN_PROGRESS,
        },
        isStriped: false,
      });
    });

    it('handles suspended objectives', () => {
      const suspendedObjective = [{
        ...mockObjectives[0],
        status: OBJECTIVE_STATUS.SUSPENDED,
        closeSuspendReason: 'Test reason',
        closeSuspendContext: 'Test context',
      }];

      const sections = [];
      addObjectiveSectionsToArray(suspendedObjective, sections, mockActivityRecipients);

      expect(sections[0].data).toHaveProperty('Reason suspended', 'Test reason - Test context');
    });
  });

  describe('getResponses', () => {
    const mockResponses = [
      {
        response: [
          'Response 1',
          'Response 2',
          'Response 3',
        ],
      },
    ];

    it('joins responses with commas', () => {
      const result = getResponses(mockResponses);
      expect(result).toBe('Response 1, Response 2, Response 3');
    });

    it('handles empty response array', () => {
      const emptyResponses = [{ response: [] }];
      const result = getResponses(emptyResponses);
      expect(result).toBe('');
    });
  });

  describe('calculateGoalsAndObjectives', () => {
    const mockRecipientReport = {
      activityRecipientType: 'recipient',
      activityRecipients: [{ name: 'Test Recipient' }],
      goalsAndObjectives: [
        {
          name: 'Test Goal',
          goalNumbers: ['G1', 'G2'],
          responses: [{ response: ['Root cause 1', 'Root cause 2'] }],
          prompts: [
            {
              title: 'Prompt 1',
              reportResponse: ['Answer 1', 'Answer 2'],
            },
          ],
          objectives: [
            {
              title: 'Objective 1',
              citations: [],
              topics: [{ name: 'Topic 1' }],
              courses: [],
              resources: [],
              files: [],
              ttaProvided: 'Training',
              supportType: 'Implementation',
              status: 'Complete',
            },
          ],
        },
      ],
    };

    const mockOtherEntityReport = {
      activityRecipientType: 'other-entity',
      activityRecipients: [{ name: 'Other Entity' }],
      objectivesWithoutGoals: [
        {
          title: 'Other Entity Objective',
          citations: [],
          topics: [{ name: 'Topic 1' }],
          courses: [],
          resources: [],
          files: [],
          ttaProvided: 'Technical Assistance',
          supportType: 'Planning',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
        },
      ],
    };

    it('processes recipient report with goals and objectives', () => {
      const result = calculateGoalsAndObjectives(mockRecipientReport);

      expect(result).toHaveLength(2);

      expect(result[0].heading).toBe('Goal summary');
      expect(result[0].data).toEqual({
        'Recipient\'s goal': 'Test Goal',
        'Goal numbers': 'G1,G2',
        'Root cause': 'Root cause 1, Root cause 2',
        'Prompt 1': 'Answer 1, Answer 2',
      });

      expect(result[1].heading).toBe('Objective summary');
      expect(result[1].data['TTA objective']).toBe('Objective 1');
    });

    it('processes other entity report with objectives only', () => {
      const result = calculateGoalsAndObjectives(mockOtherEntityReport);

      expect(result).toHaveLength(1);
      expect(result[0].heading).toBe('Objective summary');
      expect(result[0].data['TTA objective']).toBe('Other Entity Objective');
    });

    it('handles goals without responses or prompts', () => {
      const reportWithoutResponses = {
        ...mockRecipientReport,
        goalsAndObjectives: [{
          ...mockRecipientReport.goalsAndObjectives[0],
          responses: null,
          prompts: null,
        }],
      };

      const result = calculateGoalsAndObjectives(reportWithoutResponses);

      expect(result[0].data).not.toHaveProperty('Root cause');
      expect(result[0].data).not.toHaveProperty('Prompt 1');
    });

    it('filters out empty prompt responses', () => {
      const reportWithEmptyPrompts = {
        ...mockRecipientReport,
        goalsAndObjectives: [{
          ...mockRecipientReport.goalsAndObjectives[0],
          prompts: [
            {
              title: 'Empty Prompt',
              reportResponse: [],
            },
            {
              title: 'Valid Prompt',
              reportResponse: ['Valid response'],
            },
          ],
        }],
      };

      const result = calculateGoalsAndObjectives(reportWithEmptyPrompts);

      expect(result[0].data).not.toHaveProperty('Empty Prompt');
      expect(result[0].data).toHaveProperty('Valid Prompt', 'Valid response');
    });
  });
});
