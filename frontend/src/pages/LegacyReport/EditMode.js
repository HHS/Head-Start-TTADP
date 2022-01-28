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
  const [showImported, setShowImported] = useState(true);
  const [startDate, setStartDate] = useState(report.startDate);
  const [endDate, setEndDate] = useState(report.endDate);
  const [targetPopulations, setTargetPopulations] = useState(report.targetPopulations);
  const [reason, setReason] = useState(report.reason);

  const toggleShowImported = () => setShowImported(!showImported);

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

      <Form onSubmit={onSubmit} className="margin-bottom-2">
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

      <Button type="button" outline onClick={toggleShowImported}>
        {showImported ? 'Hide' : 'Show' }
        {' '}
        imported data
      </Button>
      {showImported
      && (
      <pre style={{
        whiteSpace: 'pre-wrap',
        maxWidth: '100%',
      }}
      >
        {JSON.stringify(report.imported, null, 2)}
      </pre>
      )}

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
    imported: PropTypes.string,
  }).isRequired,
};
