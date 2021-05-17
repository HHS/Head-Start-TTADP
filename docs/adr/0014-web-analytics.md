# 14. Use New Relic to record and present web analytics

Date: 2021-05-03

## Status

Accepted

## Context

We need to capture information about user behaviors and task completion on the website. We should use previously approved systems for capturing this information. This excludes services that capture and track web analytics in external systems, e.g. Google Analytics.

## Decision

We will use New Relic to capture and track web analytics. New Relic provides [browser monitoring](https://docs.newrelic.com/docs/browser/) that can capture essential metrics such as page views, and offers both [agent and SPA API](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/) and [APM](https://developer.newrelic.com/collect-data/custom-attributes) methods for capturing custom data.

## Consequences

We will install the New Relic Browser agent and enable SPA monitoring. This may require a change to our New Relic subscription and could entail additional costs.

Since we want to capture information about particular tasks users may take, we will write and maintain code to record custom user events. Analytics tracking code will need to be tested so it does not introduce unwanted side effects or otherwise make the application not work as expected.

We may need to update our APM configuration to [record custom metrics](https://docs.newrelic.com/docs/agents/nodejs-agent/extend-your-instrumentation/nodejs-custom-metrics/) that involve information more readily available to the backend.

We will create one or more [custom dashboards](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/) to make information accessible to stakeholders.

When we add new features or change existing ones, we will need to account for changes we may need to make to capture relevant analytics data.
