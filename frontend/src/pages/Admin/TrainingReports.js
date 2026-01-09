import React from 'react';
import CsvImport from './components/CsvImport';
import Req from '../../components/Req';

function TrainingReports() {
  const primaryIdColumn = 'Event ID';
  const typeName = 'training reports';
  const apiPathName = 'training-reports';

  const requiredCsvHeaders = [
    'Event ID',
    'Edit Title',
    'Event Creator',
    'Event Organizer - Type of Event',
    'Audience',
  ];

  return (
    <>
      <details>
        <summary>Instructions for CSV</summary>

        <div>
          <p className="usa-hint">
            Column names and values need to match exactly. Required columns are marked with
            {' '}
            <Req />
            .
          </p>
          <ul className="usa-list">
            <li>
              <strong>
                Event ID
              </strong>
              :
              {' '}
              Single line text value starting with R and two digits (e.g., R##-TR-####)
              <Req />
            </li>
            <li>
              <strong>
                Edit Title
              </strong>
              :
              {' '}
              Single line text value
              <Req />
            </li>
            <li>
              <strong>
                Event Creator
              </strong>
              :
              {' '}
              User email address. User must have write permissions in the event&apos;s region.
              <Req />
            </li>
            <li>
              <strong>
                Event Organizer - Type of Event
              </strong>
              :
              {' '}
              One of
              {' '}
              <em>Regional PD Event (with National Centers)</em>
              {' '}
              or
              {' '}
              <em>Regional TTA Hosted Event (no National Centers)</em>
              <Req />
            </li>
            <li>
              <strong>
                Audience
              </strong>
              :
              {' '}
              One of
              {' '}
              <em>Recipients</em>
              {' '}
              or
              {' '}
              <em>Regional office/TTA</em>
              <Req />
            </li>
            <li>
              <strong>
                Designated POC for Event/Request
              </strong>
              :
              {' '}
              A list of Hub user names, separated by the &quot;/&quot; character.
              Users must have POC permissions in the event&apos;s region.
            </li>
            <li>
              <strong>
                Vision/Goal/Outcomes for the PD Event
              </strong>
              {' '}
              (or variants like
              {' '}
              <em>Vision/Outcomes for the PD Event</em>
              ):
              {' '}
              Free text field describing the vision and goals.
            </li>
            <li>
              <strong>
                Reason for Activity
              </strong>
              :
              {' '}
              A list of reasons, separated by new lines.
              Invalid reasons will be filtered out.
            </li>
            <li>
              <strong>
                Target Population(s)
              </strong>
              :
              {' '}
              A list of target populations, separated by new lines.
              Invalid populations will be filtered out.
            </li>
            <li>
              <strong>
                State/Territory Invited
              </strong>
              :
              {' '}
              A list of state or territory names, separated by new lines.
              Must be valid U.S. state or territory names.
            </li>
            <li>
              <strong>
                IST Name
              </strong>
              :
              {' '}
              Optional field for IST trainer name.
            </li>
            <li>
              <strong>
                Event Approach
              </strong>
              {' '}
              (or
              {' '}
              <em>Event Duration</em>
              ):
              {' '}
              Optional field for training approach or duration.
            </li>
          </ul>
        </div>

      </details>
      <CsvImport
        requiredCsvHeaders={requiredCsvHeaders}
        typeName={typeName}
        apiPathName={apiPathName}
        primaryIdColumn={primaryIdColumn}
      />
    </>
  );
}
export default TrainingReports;
