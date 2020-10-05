# 6. Database

Date: 2020-09-10

## Status

Approved

## Context

Data storage and management is a key component of the tta smarthub platform. At a fundamental level, a relational as well as NoSQL systems were considered. Because the platform's data is mainly structured  and with a need for frequent queries and reports, a relational database management system was viewed as more suitable. With that in mind we looked at MySQL and PostreSQL (Postgres) both open source and popular choices.

## Decision

While both databases provide adequate storage and management, especially with updates provided by version 8 of MySQL, in the end Postgres was chosen. The main advantages of Postgres are implementations leading to better concurrency, specifically the MVCC (Multiversion Concurrency Control) without the need to use read locks, transactional ACID (Atomicity, Consistency, Isolation, Durability) support making the system less vulnerable to data corruption. Postgres also supports partial indexes, can create indexes in a non-blocking way, multiple cores, GIN/GIST indexing accelerating full-text searches.

## Consequences

We believe Postgres will provide most if not all that is needed from a database. Couple of minor disadvantages of Postgres include a need for better documentation, however there are a lot of online resources for troubleshooting. Given Postgres advantages mentioned above, this is a rather minor point. Having an object relational database will fit well with the structure of the data anticipated for the TTA Smarhub Platform.
