import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Form,
  Label,
  TextInput,
} from '@trussworks/react-uswds';
import { saveReport } from '../../fetchers/activityReports';

function ArrayField({ data, setData, labelText }) {
  return (
    <>
      <Label>
        {labelText}

        {data.map((point, index) => {
          const setValue = (e) => {
            const newValue = e.target.value;
            const arr = [...data];
            arr.splice(index, 1, newValue);
            setData(arr);
          };

          return (
            <TextInput value={point} onChange={setValue} />
          );
        })}

      </Label>
    </>
  );
}

ArrayField.propTypes = {
  data: PropTypes.arrayOf(PropTypes.string).isRequired,
  setData: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
};

export default function EditMode({ report }) {
  const { id } = report;

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [startDate, setStartDate] = useState(report.startDate);
  const [endDate, setEndDate] = useState(report.endDate);
  const [targetPopulations, setTargetPopulations] = useState(report.targetPopulations);
  const [reason, setReason] = useState(report.reason);

  const onSubmit = async (e) => {
    e.preventDefault();
    setShowError(false);
    setShowSuccess(false);

    const data = {
      startDate,
      endDate,
      targetPopulations,
      reason,
    };

    try {
      await saveReport(id, data);
      setShowSuccess(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      setShowError(true);
    }
  };

  return (
    <>
      {showSuccess
      && (
      <Alert type="success">
        <span>Your edits were successful!</span>
      </Alert>
      )}

      {showError && (
      <Alert type="error">
        <span>Something went wrong</span>
      </Alert>
      )}

      <Form onSubmit={onSubmit}>
        <Label htmlFor="startDate">Start Date</Label>
        <TextInput id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <Label htmlFor="endDate">End Date</Label>
        <TextInput id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <ArrayField
          labelText="Target Populations"
          data={targetPopulations}
          setData={setTargetPopulations}
        />

        <ArrayField
          labelText="Reason"
          data={reason}
          setData={setReason}
        />

        <Button type="submit">Submit edits</Button>
      </Form>
    </>
  );
}

EditMode.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.number,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    targetPopulations: PropTypes.arrayOf(PropTypes.string),
    reason: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
