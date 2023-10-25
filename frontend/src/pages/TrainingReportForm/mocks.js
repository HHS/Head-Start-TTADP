/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
import {
  TARGET_POPULATIONS,
  EVENT_TARGET_POPULATIONS,
  REASONS,
} from '@ttahub/common';
import fetchMock from 'fetch-mock';
import join from 'url-join';

export async function mockFetchTargetPopulationsAndReasons(throwErrors = false) {
  const targetPopulationsUrl = join('/', 'api', 'enum', 'enumName', 'TargetPopulation', 'enumType', 'report.trainingEvent');
  const reasonsUrl = join('/', 'api', 'enum', 'enumName', 'Reason', 'enumType', 'report.trainingEvent');

  const populationsResponse = [
    ...TARGET_POPULATIONS.map((targetPopulation) => ({
      name: targetPopulation,
    })),
    ...EVENT_TARGET_POPULATIONS.map((targetPopulation) => ({
      name: targetPopulation,
    })),
  ];

  const reasonsResponse = REASONS.map((reason) => ({
    name: reason,
  }));

  if (throwErrors) {
    fetchMock.get(targetPopulationsUrl, 500);
    fetchMock.get(reasonsUrl, 500);
    return;
  }

  fetchMock.get(targetPopulationsUrl, populationsResponse);
  fetchMock.get(reasonsUrl, reasonsResponse);
}
