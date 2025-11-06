# 1. Audit Log Archival

Date: 2025-09-03

## Status

Accepted

## Context

Most tables in the TTA database have associated triggers to log events in corresponding "audit log" tables.  These tables serve as a historical record of changes made to objects such as activity reports, and may be consulted for debugging and compliance activities as well as being queried for the process of sending notifications.  Over time these audit log tables have grown in size relatively unchecked and now comprise a significant portion of the overall database size.  In order to reduce the database size and ensure future growth at a sustainable pace, we would like to come up with a process to archive old events in a way that they can still be queried if necessary.

See also ADR 18 & 19

## Options Considered

* Deleting old records entirely - Potentially violates compliance obligations
* Archiving audit logs to flat file, stored in S3 - The potential need to query old records would be complicated if records are only stored as a flat file, even in structured format
* Using a separate database to store audit logs - Does not reduce overall account footprint, but would reduce the size of primary database

## Decision

* Create a new database in the production space, which will hold only archive events
* Create a new automated job, to run nightly, which will transfer audit log events from the production database to the audit database, then remove the events from the audit tables in the primary db.  
* To start with, only events older than 3 years will be transferred and removed from the primary db.  This may be adjusted in the future based on experience with the process.
* In order to facilitate development and testing, the job should be able to execute in a "dry-run" mode (only logging the changes that would be made), in a copy-only mode (only copying records to the new db), and in a copy-and-delete mode (creating and removing records).
* Will likely need to create database in a lower dev environment for testing purposes

## Consequences
* New databases created
* Additional nightly batch job for transferring records
* Backing up the audit log database would also need to be considered and implemented
* If older records need to be reviewed, engineer would need to download the audit log db to run locally

