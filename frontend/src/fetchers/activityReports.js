import join from 'url-join';
import { get, put, post } from './index';

const activityReportUrl = join('/', 'api', 'activity-reports');

export const fetchApprovers = async () => {
  const res = await get(join(activityReportUrl, 'approvers'));
  return res.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(10), 'submit');
  const report = await post(url, data);
  return report.json();
};

export const saveReport = async (reportId, data) => {
  const report = await put(join(activityReportUrl, reportId.toString(10)), data);
  return report.json();
};

export const createReport = async (data) => {
  const report = await post(activityReportUrl, data);
  return report.json();
};

export const getReport = async (reportId) => {
  const report = await get(join(activityReportUrl, reportId.toString(10)));
  return report.json();
};

export const getRecipients = async () => {
  const recipients = await get(join(activityReportUrl, 'activity-recipients'));
  return recipients.json();
};

export const getReports = async () => {
  const reports = await get(activityReportUrl);
  // return reports.json();

  const repts = [
    {
      "endDate": null,
      "startDate": null,
      "lastSaved": "01/20/2021",
      "id": 1,
      "userId": 1,
      "lastUpdatedById": 1,
      "resourcesUsed": "",
      "additionalNotes": null,
      "numberOfParticipants": 0,
      "deliveryMethod": "",
      "duration": "0.0",
      "activityRecipientType": "grantee",
      "requester": "",
      "programTypes": [
        "program type 2"
      ],
      "targetPopulations": [
        "Affected by Substance Use",
        "Affected by Disaster",
        "Pregnant Women"
      ],
      "reason": [
        "Below Competitive Threshold (CLASS)",
        "New Program Option"
      ],
      "participants": [
        "Center Director / Site Director"
      ],
      "topics": [],
      "pageState": {
        "1": "In progress",
        "2": "Not started",
        "3": "Complete",
        "4": "Not started"
      },
      "status": "draft",
      "ttaType": [],
      "updatedAt": "2021-01-20T18:04:41.984Z",
      "createdAt": "2021-01-20T18:01:00.345Z",
      "activityRecipients": [
        {
          "activityRecipientId": 2,
          "name": "Stroman, Cronin and Boehm - 14CH10000",
          "id": 6,
          "grant": {
            "id": 2,
            "number": "14CH10000",
            "grantee": {
              "name": "Stroman, Cronin and Boehm"
            }
          },
          "nonGrantee": null
        }
      ],
      "author": {
        "fullName": "Hermione Hranger, System Specialist",
        "name": "Hermione Hranger",
        "role": "System Specialist",
        "homeRegionId": 1
      }
    },
    {
      "endDate": null,
      "startDate": null,
      "lastSaved": "01/20/2021",
      "id": 1,
      "userId": 1,
      "lastUpdatedById": 1,
      "resourcesUsed": "",
      "additionalNotes": null,
      "numberOfParticipants": 0,
      "deliveryMethod": "",
      "duration": "0.0",
      "activityRecipientType": "grantee",
      "requester": "",
      "programTypes": [
        "program type 2"
      ],
      "targetPopulations": [
        "Affected by Substance Use",
        "Affected by Disaster",
        "Pregnant Women"
      ],
      "reason": [
        "Below Competitive Threshold (CLASS)",
        "New Program Option"
      ],
      "participants": [
        "Center Director / Site Director"
      ],
      "topics": [],
      "pageState": {
        "1": "In progress",
        "2": "Not started",
        "3": "Complete",
        "4": "Not started"
      },
      "status": "approved",
      "ttaType": [],
      "updatedAt": "2021-01-20T18:04:41.984Z",
      "createdAt": "2021-01-20T18:01:00.345Z",
      "activityRecipients": [
        {
          "activityRecipientId": 2,
          "name": "Troman, Cronin and Boehm - 14CH10000",
          "id": 6,
          "grant": {
            "id": 2,
            "number": "14CH10000",
            "grantee": {
              "name": "Troman, Cronin and Boehm"
            }
          },
          "nonGrantee": null
        },
        {
          "activityRecipientId": 2,
          "name": "Troman, Cronin and Boehm - 14CH10000",
          "id": 6,
          "grant": {
            "id": 2,
            "number": "14CH10000",
            "grantee": {
              "name": "Troman, Cronin and Boehm"
            }
          },
          "nonGrantee": null
        }
      ],
      "author": {
        "fullName": "Germione Granger, System Specialist",
        "name": "Germione Granger",
        "role": "System Specialist",
        "homeRegionId": 1
      }
    }
  ];
  return repts;
};
