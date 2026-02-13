import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import selectEvent from 'react-select-event'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import fetchMock from 'fetch-mock'
import { createDateFilter, reasonsFilter, statusFilter, topicsFilter, grantNumberFilter, goalNameFilter } from '../goalFilters'
import FilterErrorContext from '../FilterErrorContext'

const renderFilter = (filter) => {
  render(<FilterErrorContext.Provider value={{ setError: () => {} }}>{filter()}</FilterErrorContext.Provider>)
}

describe('goalFilters', () => {
  describe('createDateFilter', () => {
    it('displays the correct date', () => {
      const date = createDateFilter.displayQuery('2000/12/30')
      expect(date).toEqual('12/30/2000')
    })

    it('displays date ranges correctly', () => {
      const date = createDateFilter.displayQuery('2000/12/30-2000/12/31')
      expect(date).toEqual('12/30/2000-12/31/2000')
    })

    it('renders correctly', async () => {
      renderFilter(() => createDateFilter.renderInput(null, 'is', '2000/12/30', () => {}))
      const dateInput = await screen.findByLabelText('date')
      expect(dateInput).toBeInTheDocument()
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => createDateFilter.renderInput(null, 'is on or after', '', apply))
      const dateInput = await screen.findByLabelText('date')
      userEvent.type(dateInput, '01/02/2022')
      await waitFor(() => expect(apply).toHaveBeenCalled())
    })
  })

  describe('reasonsFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => reasonsFilter.renderInput('1', 'test', ['reason'], () => {}))
      const reasonInput = await screen.findByLabelText('Select reasons to filter by')
      expect(reasonInput).toBeInTheDocument()
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => reasonsFilter.renderInput('1', 'test', ['reason'], apply))
      const reasonInput = await screen.findByLabelText('Select reasons to filter by')
      await selectEvent.select(reasonInput, ['Complaint'])
      expect(apply).toHaveBeenCalled()
    })
  })

  describe('statusFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => statusFilter.renderInput('1', 'test', ['Draft'], () => {}))
      const statusInput = await screen.findByLabelText('Select status to filter by')
      expect(statusInput).toBeInTheDocument()
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => statusFilter.renderInput('1', 'test', [], apply))
      const statusInput = await screen.findByLabelText('Select status to filter by')
      await selectEvent.select(statusInput, [GOAL_STATUS.NOT_STARTED])
      expect(apply).toHaveBeenCalled()
    })

    it('displays the correct with empty array', async () => {
      const q = statusFilter.displayQuery([])
      expect(q).toBe('')
    })
  })

  describe('topicsFilter', () => {
    beforeEach(() => {
      fetchMock.get('api/topic', [
        { id: 58, name: 'Behavioral / Mental Health / Trauma' },
        { id: 60, name: 'CLASS: Classroom Organization' },
        { id: 61, name: 'CLASS: Emotional Support' },
        { id: 62, name: 'CLASS: Instructional Support' },
        { id: 63, name: 'Coaching' },
        { id: 64, name: 'Communication' },
        { id: 65, name: 'Community and Self-Assessment' },
        { id: 66, name: 'Culture & Language' },
        { id: 67, name: 'Curriculum (Instructional or Parenting)' },
        { id: 68, name: 'Data and Evaluation' },
        { id: 69, name: 'ERSEA' },
        { id: 70, name: 'Environmental Health and Safety / EPRR' },
        { id: 72, name: 'Facilities' },
        { id: 73, name: 'Family Support Services' },
        { id: 74, name: 'Fiscal / Budget' },
        { id: 75, name: 'Five-Year Grant' },
        { id: 76, name: 'Home Visiting' },
        { id: 77, name: 'Human Resources' },
        { id: 78, name: 'Leadership / Governance' },
        { id: 79, name: 'Learning Environments' },
        { id: 80, name: 'Nutrition' },
        { id: 81, name: 'Oral Health' },
        { id: 82, name: 'Parent and Family Engagement' },
        { id: 83, name: 'Partnerships and Community Engagement' },
        { id: 84, name: 'Physical Health and Screenings' },
        { id: 85, name: 'Pregnancy Services / Expectant Families' },
        { id: 86, name: 'Program Planning and Services' },
        { id: 87, name: 'Quality Improvement Plan / QIP' },
        { id: 88, name: 'Recordkeeping and Reporting' },
        { id: 89, name: 'Safety Practices' },
        { id: 90, name: 'Staff Wellness' },
        { id: 92, name: 'Technology and Information Systems' },
        { id: 93, name: 'Transition Practices' },
        { id: 94, name: 'Transportation' },
        { id: 124, name: 'Child Screening and Assessment' },
        { id: 125, name: 'Teaching / Caregiving Practices' },
        { id: 126, name: 'Disabilities Services' },
        { id: 128, name: 'Training and Professional Development' },
        { id: 129, name: 'Fatherhood / Male Caregiving' },
        { id: 130, name: 'Ongoing Monitoring and Continuous Improvement' },
      ])
    })

    afterEach(() => {
      fetchMock.restore()
    })
    it('renders correctly', async () => {
      renderFilter(() => topicsFilter.renderInput('1', 'test', ['ERSEA'], () => {}))
      const topicsInput = await screen.findByLabelText('Select topics to filter by')
      expect(topicsInput).toBeInTheDocument()
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => topicsFilter.renderInput('1', 'test', [], apply))
      const topicsInput = await screen.findByLabelText('Select topics to filter by')
      await selectEvent.select(topicsInput, ['ERSEA'])
      expect(apply).toHaveBeenCalled()
    })
  })

  describe('grantNumberFilter', () => {
    const grantFilter = grantNumberFilter([
      {
        numberWithProgramTypes: 'number EHS',
        number: 'number',
        status: 'Active',
      },
    ])

    const grantFilterWithNoPossibleGrantsYet = grantNumberFilter([])

    it('renders correctly', async () => {
      renderFilter(() => grantFilter.renderInput('1', 'test', ['number'], () => {}))
      const grantNumberInput = await screen.findByLabelText('Select grant numbers to filter by')
      expect(grantNumberInput).toBeInTheDocument()
    })

    it('displays the correct values', async () => {
      const q = grantFilter.displayQuery(['number'])

      expect(q).toBe('number EHS')
    })

    it('displays the correct values with no possible grants', async () => {
      const q = grantFilterWithNoPossibleGrantsYet.displayQuery(['number'])

      expect(q).toBe('number')
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => grantFilter.renderInput('1', 'test', [], apply))
      const grantNumberInput = await screen.findByLabelText('Select grant numbers to filter by')
      await selectEvent.select(grantNumberInput, ['number EHS - Active'])
      expect(apply).toHaveBeenCalled()
    })
  })

  describe('goalNameFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => goalNameFilter.renderInput('1', 'test', 'text', () => {}))
      const input = await screen.findByLabelText('Goal text')
      expect(input).toBeInTheDocument()
    })

    it('displays the correct values', async () => {
      const q = goalNameFilter.displayQuery('number')

      expect(q).toBe('number')
    })

    it('calls onApply', async () => {
      const apply = jest.fn()
      renderFilter(() => goalNameFilter.renderInput('1', 'test', 'test', apply))
      const input = await screen.findByLabelText('Goal text')
      userEvent.type(input, 'number')
      expect(apply).toHaveBeenCalled()
    })
  })
})
