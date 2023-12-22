import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  FormGroup,
  FileInput,
  Label,
  Button,
} from '@trussworks/react-uswds';
import Container from '../../../components/Container';
import {
  importCsv,
} from '../../../fetchers/Admin';

export default function CsvImport(
  {
    validCsvHeaders,
    requiredCsvHeaders,
    typeName,
    apiPathName,
    primaryIdColumn,
  },
) {
  const [error, setError] = useState();
  const [success, setSuccess] = useState();
  const [info, setInfo] = useState();

  const [skipped, setSkipped] = useState([]);
  const [errors, setErrors] = useState([]);

  const fileInputRef = useRef(null);

  const importCsvFile = async () => {
    try {
      // Reset summary info.
      setSkipped([]);
      setErrors([]);

      // Get the file from the file input from ref.
      const { files } = fileInputRef.current;
      const file = files[0];

      // If there is no file to import throw an error.
      if (!file) {
        setError('Please select a file to import.');
        return;
      }

      // Get File.
      const data = new FormData();
      data.append('file', file, { contentType: file.type });
      const res = await importCsv(apiPathName, data);
      setSuccess(`${res.count} ${typeName} imported successfully.`);
      setSkipped(res.skipped);
      setErrors(res.errors);
      setError('');
    } catch (err) {
      setError(`Error attempting to import ${typeName}.`);
    } finally {
      // Clear file input.
      setInfo('');
    }
  };

  const onChange = (e) => {
    const { files } = e.target;

    // Clear error and success messages.
    setError('');
    setSuccess('');
    setInfo('');

    // Verify that the file is a CSV.
    if (files.length === 1 && files[0].type !== 'text/csv') {
      setError('Please upload a CSV file.');
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // Load the csv.
      const csv = event.target.result;

      // Replace all instances of LF that are not followed by a CR with a space.
      const cleanCsv = csv.replace(/\r(?!\n)/g, ' ');

      // Get all headers.
      const headers = cleanCsv.split('\r\n')[0].split(',');

      // Validate columns.
      const requiredHeaders = requiredCsvHeaders.filter((header) => !headers.includes(header));
      const invalidHeaders = headers.filter((header) => !validCsvHeaders.includes(header));
      if (requiredHeaders.length > 0) {
        setError(`Required headers missing: ${requiredHeaders.join(', ')}`);
        e.target.value = null;
        return;
      }
      if (invalidHeaders.length > 0) {
        setError(`Invalid headers found: ${invalidHeaders.join(', ')}`);
        e.target.value = null;
        return;
      }

      // Get a distinct count of primary id column's.
      const importIds = cleanCsv.split('\r\n').map((row) => row.split(',')[1]).filter((id) => id !== primaryIdColumn && id !== undefined);
      const distinctImportIds = [...new Set(importIds)];

      // Check if we have duplicate primary Id Column values.
      if (distinctImportIds.length !== importIds.length) {
        setError(`Duplicate ${primaryIdColumn}'s found. Please correct and try again.`);
        e.target.value = null;
        return;
      }

      // Display count of distinct ids.
      setInfo(`${distinctImportIds.length} ${typeName} will be imported.`);

      // Clear errors and enable import button.
      setError('');
    };

    // call reader with the file.
    reader.readAsText(files[0]);
  };
  return (
    <>
      <Container paddingX={1} paddingY={1} className="smart-hub--overflow-auto">
        <div>
          <h2>
            { typeName }
            {' '}
            Import
          </h2>
          {(success && !error) && (
            <Alert type="success" className="margin-bottom-1 maxw-mobile-lg" noIcon>
              {success}
            </Alert>
          )}
          {error && (
            <Alert type="error" className="margin-bottom-1 maxw-mobile-lg" noIcon>
              {error}
            </Alert>
          )}
          {info && (
          <Alert type="info" className="margin-bottom-1 maxw-mobile-lg" noIcon>
            {info}
          </Alert>
          )}
          <div className="display-flex">
            <FormGroup>
              <Label htmlFor="tr-file-input-single">Input accepts a single file</Label>
              <FileInput id="tr-file-input-single" name="tr-file-input-single" onChange={onChange} ref={fileInputRef} />
              {(success) && (
                <div>
                  <h3>Import Summary:</h3>
                  <ul>
                    <li>
                      {`${skipped.length} skipped`}
                      {skipped.map((item) => (
                        <li key={item} style={{ marginLeft: '20px' }}>{item}</li>
                      ))}
                    </li>
                    <li>
                      {`${errors.length} errors`}
                      {errors.map((err) => (
                        <li key={err} style={{ marginLeft: '20px' }}>{err}</li>
                      ))}
                    </li>
                  </ul>
                </div>
              )}
              <Button className="margin-top-2" type="button" onClick={importCsvFile}>
                Upload
                {' '}
                { typeName }
              </Button>
            </FormGroup>
          </div>

        </div>
      </Container>
    </>
  );
};

CsvImport.propTypes = {
  validCsvHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
  requiredCsvHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
  typeName: PropTypes.string.isRequired,
  apiPathName: PropTypes.string.isRequired,
  primaryIdColumn: PropTypes.string.isRequired,
};
