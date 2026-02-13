import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import ObjectiveForm from '../ObjectiveForm'
import UserContext from '../../../UserContext'
import { OBJECTIVE_ERROR_MESSAGES } from '../constants'
import { OBJECTIVE_STATUS } from '../../../Constants'

const [objectiveTextError] = OBJECTIVE_ERROR_MESSAGES

describe('ObjectiveForm', () => {
  const defaultObjective = {
    title: 'This is an objective',
    files: [],
    closeSuspendReason: '',
    closeSuspendContext: '',
    topics: [
      {
        id: 1,
        name: 'Behavioral / Mental Health / Trauma',
      },
    ],
    resources: [{ key: 'gee-whix', value: '' }],
    id: 123,
    status: OBJECTIVE_STATUS.NOT_STARTED,
    supportType: 'Maintaining',
  }

  const index = 1

  const renderObjectiveForm = (
    objective = defaultObjective,
    removeObjective = jest.fn(),
    setObjectiveError = jest.fn(),
    setObjective = jest.fn(),
    goalStatus = 'Draft',
    userCanEdit = true
  ) => {
    render(
      <UserContext.Provider value={{ user: { flags: [] } }}>
        <ObjectiveForm
          index={index}
          isOnReport={false}
          removeObjective={removeObjective}
          setObjectiveError={setObjectiveError}
          objective={objective}
          setObjective={setObjective}
          errors={[<></>, <></>, <></>, <></>, <></>, <></>]}
          goalStatus={goalStatus}
          onUploadFiles={jest.fn()}
          topicOptions={[
            'Behavioral / Mental Health / Trauma',
            'Child Screening and Assessment',
            'CLASS: Classroom Organization',
            'CLASS: Emotional Support',
            'CLASS: Instructional Support',
            'Coaching',
            'Communication',
            'Community and Self-Assessment',
            'Culture & Language',
            'Curriculum (Instructional or Parenting)',
            'Data and Evaluation',
          ].map((name, id) => ({ id, name }))}
          userCanEdit={userCanEdit}
        />
      </UserContext.Provider>
    )
  }

  beforeEach(() => {
    fetchMock.get(
      '/api/feeds/item?tag=ttahub-topic',
      `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`
    )
  })

  afterEach(() => {
    fetchMock.restore()
    jest.clearAllMocks()
  })

  it('validates text and topics', async () => {
    const objective = {
      title: '',
      topics: [],
      resources: [{ key: 'gee-whix', value: '' }],
      status: OBJECTIVE_STATUS.NOT_STARTED,
    }

    const removeObjective = jest.fn()
    const setObjectiveError = jest.fn()
    const setObjective = jest.fn()

    renderObjectiveForm(objective, removeObjective, setObjectiveError, setObjective)

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i })
    userEvent.click(objectiveText)
    userEvent.tab() // trigger blur event

    expect(setObjectiveError).toHaveBeenCalledWith(index, [
      <span className="usa-error-message">{objectiveTextError}</span>,
      <></>,
      <></>,
      <></>,
      <></>,
      <></>,
    ])
  })
})
