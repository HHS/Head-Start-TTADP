# 13. Add job queue and worker

# Date
20201-02-13

## Status

Accepted

## Context

In order to satisfy the [RA-5](https://nvd.nist.gov/800-53/Rev4/control/RA-5)
control around vulnerability scanning, we wish to scan all user-uploaded files
with a malware detection service. We want to satisfy the following requirements.
1. Scanning can be done asyncronously so as not to negatively impact the user experience.
2. Scanning should be loosely coupled to main application to allow for more resiliance and fault tolerance.
3. Scanning should be retried if malware detection service is unavailable.
4. Scanning should run on a seperate instance to prevent a negative impact to the user experience.

## Decision

We will use redis as a queue and build a worker node which will take jobs from the queue, send them to the malware detection service and then update the database with the scan results.

## Consequences

All of the above requirements are filled. This does introduce some additional complexity in the form of a redis instance and worker instance. However, cloud.gov supplies managed redis instances and the worker will be built on top of an official node.js buildpack, so any additional maintenance from running these instances is negligable.