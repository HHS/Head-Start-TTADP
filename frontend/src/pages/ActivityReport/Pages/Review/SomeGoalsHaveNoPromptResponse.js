import React, { useState } from 'react'
import PropTypes from 'prop-types'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { Alert, Button } from '@trussworks/react-uswds'
import { Link } from 'react-router-dom'
import { missingDataForActivityReport } from '../../../../fetchers/goals'

const MissingGoalDataList = ({ missingGoalData }) => (
  <ul className="usa-list margin-left-2">
    {missingGoalData.map((goal) => (
      <li key={goal.id}>
        <Link
          aria-label={`Edit goal ${goal.id} in a new tab`}
          to={`/recipient-tta-records/${goal.recipientId}/region/${goal.regionId}/goals?id[]=${goal.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {goal.recipientName} {goal.grantNumber} {goal.id}
        </Link>
      </li>
    ))}
  </ul>
)

MissingGoalDataList.propTypes = {
  missingGoalData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      recipientId: PropTypes.number,
      regionId: PropTypes.number,
      recipientName: PropTypes.string,
      grantNumber: PropTypes.string,
    })
  ).isRequired,
}

const RefreshListOfGoalsButton = ({ onClick }) => (
  <Button outline onClick={onClick}>
    Refresh list of goals
  </Button>
)

RefreshListOfGoalsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}

const SomeGoalsHaveNoPromptResponse = ({ promptsMissingResponses, goalsMissingResponses, regionId, onSaveDraft }) => {
  const [missingGoalData, setMissingGoalData] = useState()

  async function fetchMissingData(goalIds) {
    try {
      const data = await missingDataForActivityReport(regionId, goalIds)
      setMissingGoalData(data)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching missing data', error)
      setMissingGoalData([])
    }
  }

  const onClickRefresh = async (e) => {
    e.preventDefault()
    const forceUpdate = true
    const isAutoSave = false
    await onSaveDraft(isAutoSave, forceUpdate)
  }

  useDeepCompareEffect(() => {
    const ids = goalsMissingResponses.flatMap((goal) => goal.goalIds)
    if (!ids.length) return
    if (!regionId) return

    fetchMissingData(ids)
  }, [goalsMissingResponses, regionId])

  if (!missingGoalData) {
    return null
  }

  return (
    <Alert validation noIcon slim type="error">
      <strong>Some goals are incomplete</strong>
      <br />
      Please check the Recipient TTA Record and complete the missing fields.
      <ul className="usa-list margin-left-2">
        {promptsMissingResponses.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
      {missingGoalData.length > 0 && (
        <details open>
          <summary>
            <strong>Incomplete goals</strong>
          </summary>
          <MissingGoalDataList missingGoalData={missingGoalData} />
          <RefreshListOfGoalsButton onClick={onClickRefresh} />
        </details>
      )}
    </Alert>
  )
}

SomeGoalsHaveNoPromptResponse.propTypes = {
  promptsMissingResponses: PropTypes.arrayOf(PropTypes.string).isRequired,
  goalsMissingResponses: PropTypes.arrayOf(
    PropTypes.shape({
      goalIds: PropTypes.arrayOf(PropTypes.number),
    })
  ).isRequired,
  regionId: PropTypes.number.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
}

export default SomeGoalsHaveNoPromptResponse
