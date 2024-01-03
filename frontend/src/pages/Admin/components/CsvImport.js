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

  const [created, setCreated] = useState();
  const [skipped, setSkipped] = useState([]);
  const [errors, setErrors] = useState([]);
  const [replaced, setReplaced] = useState([]);
  const [updated, setUpdated] = useState([]);
  const [deleted, setDeleted] = useState([]);

  const fileInputRef = useRef(null);

  const importCsvFile = async () => {
    try {
      // Reset summary info.
      setCreated([]);
      setSkipped([]);
      setErrors([]);
      setReplaced([]);
      setUpdated([]);
      setDeleted([]);

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
      setCreated(res.created);
      setSkipped(res.skipped);
      setErrors(res.errors);
      setReplaced(res.replaced);
      setUpdated(res.updated);
      setDeleted(res.deleted);
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

      // Get all values from the column that is the primary id column.
      let importIds = cleanCsv.split('\r\n').map((row) => {
        const value = row.includes(',') ? row.split(',')[headers.indexOf(primaryIdColumn)] : row;
        return value;
      });

      // Remove the first element which is the header.
      importIds.shift();

      // Remove any blank values.
      importIds = importIds.filter((id) => id !== '');

      const distinctImportIds = [...new Set(importIds)];

      // Get distinct all duplicate values from the primary id column.
      const duplicateIds = distinctImportIds.filter((id) => {
        const count = importIds.filter((i) => i === id).length;
        return count > 1;
      });
      const distinctDuplicateImportIds = [...new Set(duplicateIds)];

      // Check if we have duplicate primary Id Column values.
      if (distinctDuplicateImportIds.length > 0) {
        setError(`Duplicate ${primaryIdColumn}s found. Please correct and try again. Duplicates:
        ${distinctDuplicateImportIds.join(', ')}`);
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
            {
                // Capitalize first letter of each word in typeName.
                typeName.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            }
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
                    {
                        created && created.length > 0 && (
                        <li>
                          {`${created.length} created`}
                          {created.map((c) => (
                            <li key={c.name} style={{ marginLeft: '20px' }}>{c.name}</li>
                          ))}
                        </li>
                        )
                        }
                    {
                        skipped && skipped.length > 0 && (
                        <li>
                          {`${skipped.length} skipped`}
                          {skipped.map((item) => (
                            <li key={item} style={{ marginLeft: '20px' }}>{item}</li>
                          ))}
                        </li>
                        )
                      }
                    {
                        errors && errors.length > 0 && (
                        <li>
                          {`${errors.length} errors`}
                          {errors.map((err) => (
                            <li key={err} style={{ marginLeft: '20px' }}>{err}</li>
                          ))}
                        </li>
                        )
                      }
                    {
                        replaced && replaced.length > 0 && (
                        <li>
                          {`${replaced.length} replaced`}
                          {replaced.map((r) => (
                            <li key={r.name} style={{ marginLeft: '20px' }}>{r.name}</li>
                          ))}
                        </li>
                        )
                        }
                    {
                         updated && updated.length > 0 && (
                         <li>
                           {`${updated.length} updated`}
                           {updated.map((u) => (
                             <li key={u.name} style={{ marginLeft: '20px' }}>{u.name}</li>
                           ))}
                         </li>
                         )
                        }
                    {
                        deleted && deleted.length > 0 && (
                        <li>
                          {`${deleted.length} deleted`}
                          {deleted.map((d) => (
                            <li key={d.name} style={{ marginLeft: '20px' }}>{d.name}</li>
                          ))}
                        </li>
                        )

                    }
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
}

CsvImport.propTypes = {
  validCsvHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
  requiredCsvHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
  typeName: PropTypes.string.isRequired,
  apiPathName: PropTypes.string.isRequired,
  primaryIdColumn: PropTypes.string.isRequired,
};
