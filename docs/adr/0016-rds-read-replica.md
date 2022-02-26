# RDS Read Replicas as a response to multiple challenges

## Status

proposed

## Context

Pulled from [the original discussion](https://docs.google.com/document/d/1ul4BJitH8NwdCXHoH3eQI9NgfI93GRlIuUn724CWOXA) in a Google doc.

### Challenge 1: Database access without impacting users

Currently, when analysts (or QA, or anyone else) wants to pull fresh data from production, it
- Produces data in a denormalized form that may not be the most convenient for analysis
- Hits the production database directly.

### Challenge 2: DB single source of failure
If there is a problem with the production database instance, we would probably need to take down and restore the database, during which TTA Hub would be down. We actually had an incident in which we needed to do this, which took several hours and lost significant data due to backup age

### Challenge 3: Replication to other stages
A script to create a PII-free copy of the production database exists, and needs to be run against a running copy of the production database. Without further engineering, this means running the prod db copy locally.

## Decision

### Challenge 1:

Read replicas technically allow an analyst or QA to access production data without placing loads on the database backing the production application, and to query any way they please.  However, access to anything in prod is tightly controlled, requiring coordination with multiple people. So, this is probably not a use case where read replicas are most useful at this time.

### Challenge 2:

Read Replicas can be promoted to primary within a few minutes. That is far faster than restoring from backup and loses little if any data. However, the promotion is neither transparent (connection settings would have to change) nor instantaneous (it takes a bit of time to reach a consistent state). So, not only would we need to perform some engineering work to allow swapping the application to the standby instance, there’d still be some delay.

Given our rather small data size, the gain relative to just starting up a new instance from the last snapshot would probably be too small to be worth it if we had point-in-time backups. However, the recent incident seems to indicate that *we do not have point-in-time backups available*. On the other hand, having a Read Replica is very limited protection from a data corruption incident, because we would need to act extremely quickly to prevent the corruption from spreading to the replica. That is, a replica helps if the main gets stuck somehow, but not if there's a data mistake.

We could get a nicer version of this from Aurora, which should be mostly drop-in compatible.

### Challenge 3:
We could potentially promote a read replica to its own instance and run the script against it.

However, that’s probably complicating things. We could just as easily have a terraform script that starts up a database from the latest snapshot, runs the script against it, and produces a new snapshot from which the other phases start their databases. That would also be safer, as a script would obviate the possibility of accidentally choosing the wrong database.

### Verdict
Of the possible benefits, RDS Read Replicas only seem like a possibly worthwhile response for the second, "DB single source of failure" challenge. Whether it's worth it in the near term is not clear.

## Consequences

Adding a Read Replica on its own is extremely low impact. It is a small extra hosting cost, but the engineering effort is minimal. However, to make it really help would cost more engineering effort.
