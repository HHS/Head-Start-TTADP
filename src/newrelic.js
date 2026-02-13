/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names. Only applicable for local development because deployed
   * environments use the env variable.
   *
   * @env NEW_RELIC_APP_NAME
   */
  app_name: ['tta-smart-hub-development'],
  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   * Default is true.
   */
  distributed_tracing: {
    /**
     * Enables/disables distributed tracing.
     *
     * @env NEW_RELIC_DISTRIBUTED_TRACING_ENABLED
     */
    enabled: true,
  },
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info',
    filepath: 'stdout',
  },
  /**
   * [Audit logging](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/#audit_log)
   * This section defines the Node.js agent variables in the order they typically appear
   * in the audit_log: { section of your app's newrelic.js configuration file.
   */
  audit_log: {
    enabled: process.env.NEW_RELIC_AUDIT_LOG_ENABLED ? process.env.NEW_RELIC_AUDIT_LOG_ENABLED : false,
    endpoints: process.env.NEW_RELIC_AUDIT_LOG_ENDPOINTS
      ? process.env.NEW_RELIC_AUDIT_LOG_ENDPOINTS
      : ['error_data', 'error_event_data', 'sql_trace_data'],
  },
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: false,
  attributes: {
    /**
     * Attributes to include from all destinations. Allows * as wildcard at end.
     *
     * NOTE: If including headers, they must be in camelCase form to be included.
     *
     * @env NEW_RELIC_ATTRIBUTES_INCLUDE
     */
    include: [
      'request.headers.accept',
      'request.headers.host',
      'request.headers.referer',
      'request.headers.userAgent',
      'response.headers.contentType',
      'response.headers.date',
    ],
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end. Will only have effect if `allow_all_headers` is true
     *
     * NOTE: If excluding headers, they must be in camelCase form to be filtered.
     *
     * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
     */
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
  error_collector: {
    expected_status_codes: ['401', '403'],
  },
  /**
   * [Transaction tracer variables](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/#tx_tracer_config)
   * The agent groups your requests into transactions, which are used to:
   *  * Visualize where your app spends its time (in transaction breakdowns).
   *  * Identify slow requests.
   *  * Group metrics.
   *  * Isolate other issues, such as slow database performance.
   * This section defines the Node.js agent variables in the order they typically appear in
   * the transaction_tracer: { section of your app's newrelic.js configuration file.
   */
  transaction_tracer: {
    enabled: process.env.NEW_RELIC_TRACER_ENABLED ? process.env.NEW_RELIC_TRACER_ENABLED : false,
    record_sql: process.env.NEW_RELIC_RECORD_SQL ? process.env.NEW_RELIC_RECORD_SQL : 'raw',
  },
  /**
   * [Slow queries variables](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/#slow-queries)
   * This section defines the Node.js agent variables in the order they typically appear in
   * the slow_sql: { section of your app's newrelic.js configuration file. These options control
   * behavior for slow queries, but do not affect SQL nodes in transaction traces.
   */
  slow_sql: {
    enabled: process.env.NEW_RELIC_SLOW_SQL_ENABLED ? process.env.NEW_RELIC_SLOW_SQL_ENABLED : false,
    max_samples: process.env.NEW_RELIC_MAX_SQL_SAMPLES ? process.env.NEW_RELIC_MAX_SQL_SAMPLES : 100,
  },
}
