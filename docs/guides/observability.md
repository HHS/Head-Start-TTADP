# Observability

## New Relic

New Relic provides tools for application monitoring and web analytics. New Relic's [Application Performance Monitoring (APM)](https://docs.newrelic.com/docs/apm/) monitors and measures application performance and activity on the backend.  This data is captured by integration with the New Relic npm package running as part of our server code.  We also use New Relic to send periodic HTTP health checks to validate the site is up and running.  Alerts are configured for conditions such as an elevated error rate, slow request response times, or failed health checks.  These alerts are sent to the #acf-head-start-alerts Slack channel.

Login to [New Relic here](https://one.newrelic.com), contact team lead for access to the credentials.
* First place to look for information on the site is the APM section (far left).  Here you can see an overview of overall site performance, as well as dig into detailed traces for errors or long-running transactions.
* Health checks are configured under the Synthetic Monitoring section.  Here you can review or change configuration of the HTTP/ping checks for the site.
* Alerts connect data to notifications.  In order to get notified of an event, create an alert targeting a particular data source (or create the alert directly from another graph/source), then connect it to an "alert policy".  The alert policy defines where the alert will be sent, such as Slack, email, etc.
* It's also possible to view and query logs captured in New Relic, such as [here](https://onenr.io/0BR6L4MqpQO)

## Logging

### OpenSearch

There are a few ways to access logs from the running application.  Aggregated, searchable logs with full history are available through OpenSearch on cloud.gov.  Login to [cloud.gov](https://login.fr.cloud.gov/), then select logging.  You can find prebuilt dashboards such as application errors from the dropdown on the top left, restrict your query to a specific environment with the built-in filters on the right, or construct your own query in the textbox.  You can query metadata values such as `@source.type=APP AND @cf.space=ttahub-prod AND @level="ERROR"` or search for specific text strings.

### Instance Logs

It's also possible to view live or recent logs from a particular app instance.  These can be seen in the cloud.gov dashboard under the application itself, or through the CLI with the command `cf logs tta-smarthub-dev-blue`. This will stream logs to your terminal, or you can add the `--recent` flag to see the last few minutes.

## Analytics

Integration with [Google Analytics](https://analytics.google.com/) captures metrics such as active users, page views, and more.

## Metrics for Smart Hub

### Version 1, 4/16/21

#### Operational

- % uptime

- Average Response Time

- Request rates

- Error rates

- Application/CPU usage

#### Usage (by region and cumulative)

- \# of registered users (in admin tool or New Relic?)

- \# of closed user accounts (proxy for regional TTA turnover? Also in DOC
SmartSheets)

- \# of unique visitors

- \# of visits per unique user

- \# of visits by role (specialist, manager, federal staff by region)

- Avg time on site by user

#### Tasks (by region and cumulative)

- Avg time spent on each AR

- \# of visits per AR (from draft AR through approved AR)

- \# of “cut & paste” on each AR (Proxy for pasting content from
different applications or systems)

- \# of “request revisions” for each AR (from manager to creator)

- \# of “print” ARs (distribution to recipients or team members who want it
outside the Hub)

- \# of URL “share” ARs (distribution from TTA to other members with Hub
accounts. Once we create the Recipient TTA Record, will this decline?)

- \# csv exports

