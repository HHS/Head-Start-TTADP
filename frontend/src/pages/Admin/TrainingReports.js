import React from 'react';
import CsvImport from './components/CsvImport';
import Req from '../../components/Req';

function TrainingReports() {
  const primaryIdColumn = 'Event ID';
  const typeName = 'training reports';
  const apiPathName = 'training-reports';

  const requiredCsvHeaders = [
    'Event ID',
    'Event Title',
    'IST/Creator',
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
              Single line text value
              <Req />
            </li>
            <li>
              <strong>
                Event Title
              </strong>
              :
              {' '}
              Single line text value
              <Req />
            </li>
            <li>
              <strong>
                IST/Creator
              </strong>
              :
              {' '}
              Single line text value, user email address
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
              <em>IST TTA/Visit</em>
            </li>
            <li>
              <strong>
                National Centers
              </strong>
              :
              {' '}
              A three or four digit national center identifier.
              This will find and attach the associated user as a collaborator on the event.
            </li>
            <li>
              <strong>
                Event Duration
              </strong>
              :
              {' '}
              One of
              {' '}
              <em>1 day or less</em>
              {' '}
              or
              {' '}
              <em>Multi-Day single event</em>
              or
              {' '}
              <em>Series</em>
            </li>
            <li>
              <strong>
                Reason(s) for PD
              </strong>
              :
              {' '}
              A list of reasons, separated by new lines.
              Any reasons not matching one of the reasons we expect will be ignored.
            </li>
            <li>
              <strong>
                Vision/Goal/Outcomes for the PD Event
              </strong>
              :
              {' '}
              A free text field. Formatting other than spaces or new lines will not be preserved.
            </li>
            <li>
              <strong>
                Target Population(s)
              </strong>
              :
              {' '}
              A list of populations, separated by new lines.
              Any reasons not matching one of the target populations we expect will be ignored.
            </li>
            <li>
              <strong>
                Audience
              </strong>
              :
              {' '}
              One of
              {' '}
              <em>Regional office/TTA</em>
              {' '}
              or
              {' '}
              <em>Recipients</em>
            </li>
            <li>
              <strong>
                Designated Region POC for Event/Request
              </strong>
              :
              {' '}
              A list of Hub user&apos;s names, seperated by the &quot;&#x2F;&quot; character.
              Any names not matching an existing user will be ignored.
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
