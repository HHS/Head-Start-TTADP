# ADR: Archiving Growing Audit Logs

## Status
Proposed

## Context
We need to determine the most suitable approach for archiving growing audit logs. The data retention period specified by OCIO is 6 years. While we plan to leave the TTA Hub data used for analytics intact, the audit logs providing a historic view of how that data changed need to be managed. The main reason behind the need to implement an archiving strategy is to ensure the rapidly growing data doesn't stand in the way of the application performance. We have identified two alternatives for archiving the audit logs:

1. Postpone Archiving: The first option is to postpone archiving until the end of the 6-year data retention period. This means that no specific archiving mechanism will be implemented until that time.

2. Periodic Archiving, e.g. quaterly or monthly using Node.js cron and JavaScript/TypeScript: The second option is to implement a periodic archiving process using Node.js cron functionality with JavaScript/TypeScript code. The code will retrieve the data from Postgres and save it to an S3 bucket. The S3 bucket already has server-side encryption enabled.

### Advantages and disadvantages of option 1:
By not implementing anything now, we don't incur costs of implementing the archiving, testing for accuracy, and the development of an admin UI to allow for seamless restores as needed. However, by allowing the audit logs to grow we are running a risk of a general application response time slowdown as well as significantly increased times to backup the database.

### Advantages and disadvantages of option 2:
The main advantage of implementing an archiving strategy now is that our application performance will not be impacted by rapidly growing audit log data. The production backups will operate as they do now without unnecessary slowdowns. A disadvantage of this option is that we will need to dedicate resources to implement, test and monitor the solution.



## Decision
After evaluating the advantages and disadvantages of both alternatives, we are proposing to proceed with the second option: Periodic Archiving to S3 using Node.js cron.

## Consequences
The chosen alternative has the following consequences:

1. Compliance with Data Retention Policy: Since we are not proposing to archive the primary data, archiving the audit logs periodically aligns with the data retention period specified by OCIO, ensuring compliance with organizational policies and regulatory requirements.

2. Timely Data Archiving: By implementing a periodic archiving process, we ensure that the audit logs are regularly backed up and archived. This minimizes the risk of data loss or corruption and facilitates easier retrieval if needed.

3. Reduced Storage Burden: Archiving the audit logs periodically helps manage storage requirements effectively. By offloading older data to S3, we can free up space in the production database, optimizing its performance.

4. Data Security: The utilization of server-side encryption in the S3 bucket ensures that the archived audit logs are stored securely at rest.

5. Scalability and Automation: Implementing the archiving process allows for scalability and automation. As the volume of audit logs grows, the code can be enhanced to handle larger data sets efficiently. Automation ensures consistency and eliminates manual intervention, reducing the risk of errors.

6. Development Overhead: Implementing the archiving process may require additional development effort initially, such as writing the code, testing and creating a period retrieval strategy. However, these investments can lead to long-term benefits.

## Other Considerations
The following considerations should be taken into account:

1. Error Handling and Monitoring: Implement robust error handling mechanisms and logging capabilities to capture any issues that may arise during the archiving process. This helps with troubleshooting and ensuring data integrity.

2. Performance Optimization: Consider performance optimization techniques, such as batching data retrieval and utilizing streaming methods, to improve the efficiency of the archiving process.
