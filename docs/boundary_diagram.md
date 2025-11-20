System Boundary Diagram
=======================

![rendered boundary diagram]

UML Source
----------

```plantuml
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Hub boundary view
Person(personnel, "TTA Hub User", "An end-user of the TTA Hub")
Person(developer, "TTA Hub Developer", "TTA Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  System(AWS_SES_SMTP_Server, "Email Server", "AWS SES")
  System(AWS_SNS, "Bounces and Complaints", "AWS SNS - Simple Notifications Service")
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Boundary(app, "Application") {
        Container(www_app, "<&layers> TTA Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
        Container(worker_app, "<&layers> TTA Hub Worker Application", "NodeJS, Bull", "Perform background work and data processing")
        Container(similarity_api, "Similarity API", "Python", "AI application to identify similarity of text")
        Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads\n\n docker: ajilaag/clamav-rest:20211026")
        Container(www_jwks, ".well-known/jwks.json (JWKS)", "HTTP JSON", "Publishes public JWK (kid) for token client-auth verification")
      }
      Boundary(auto, "Automation") {
        Container(auto_prod_backup, "<&layers> Automation (Production backup)", "bash", "Streams database backup directly to s3(backup) in a password protected encrypted zip compressed format") #green
        Container(auto_prod_restore, "<&layers> Automation (Restore for processing)", "bash", "Streams database backup directly from s3(backup) in a password protected encrypted zip compressed format to processing DB") #green
        Container(auto_prod_proc, "<&layers> Automation (Processing to remove PII)", "NodeJS", "Processes restored production data to remove PII for use in lower environments") #green
        Container(auto_proc_backup, "<&layers> Automation (Backup processed DB)", "bash", "Streams processed database backup directly to s3(backup) in a password protected encrypted zip compressed format") #green
        Container(auto_proc_restore, "<&layers> Automation (Restore processed data to lower environments)", "bash", "Streams processed database backup directly from s3(backup) in a password protected encrypted zip compressed format to lower environment DB") #green
      }
      note right of auto
          At any one time, a max of only one of these configurations is enabled.
          All connections are unbound when not in use.
          No routes are configured.
          Resources (RAM, Disk) are minimized to only what is needed for the singular automation task.
      end note
      Boundary(cloudgov_services, "Services") {
        ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for the TTA Hub")
        ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
        ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")

        ContainerDb(auto_db, "Automation PostgreSQL Database", "AWS RDS", "Used to process production data to remove PII") #green
        ContainerDb(auto_s3, "Automation AWS S3 bucket", "AWS S3", "Stores production and processed DB backups") #green

        ContainerDb(logs_s3, "Log transfer AWS S3 bucket", "AWS S3", "Stores production DB logs when requested from cloud.gov") #orange
      }
      Boundary(cloudgov_services_staging, "Services - Staging") {
        ContainerDb(staging_db, "PostgreSQL Database", "AWS RDS", "Contains PII-free content and configuration for the TTA Hub testing") #violet
      }
      Boundary(cloudgov_services_dev, "Services - Dev") {
        ContainerDb(dev_db, "PostgreSQL Database", "AWS RDS", "Contains PII-free content and configuration for the TTA Hub testing") #violet
      }
      Boundary(cloudgov_services_sandbox, "Services - Sandbox") {
        ContainerDb(sandbox_db, "PostgreSQL Database", "AWS RDS", "Contains PII-free content and configuration for the TTA Hub testing") #violet
      }
    }
  }
}
Boundary(hses, "HSES") {
  System(HSES_AUTH, "HSES_AUTH", "Single Sign On\nMFA via Time-Based App or PIV card")
  System(HSES_DATA, "HSES_DATA", "Source of Grantee Data")
}
Boundary(itams, "ITAMS") {
  System(SFTP, "SFTP", "SFTP with files for Monitoring/CLASS data")
}
Boundary(gsa_saas, "SaaS") {
  System_Ext(google_tag_manager, "Google Tag Manager", "Tag Manager")
  System_Ext(google_analytics, "Google Analytics", "Web Analytics")
}
Boundary(gsa_fed_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}

Rel(www_db, auto_prod_backup, "backup", "pg_dump")
Rel(auto_prod_backup, auto_s3, "store", "aws s3")

Rel(auto_s3, auto_prod_restore, "retrieve", "aws s3")
Rel(auto_prod_restore, auto_db, "restore", "psql")

BiRel(auto_db, auto_prod_proc, "process", "psql")

Rel(auto_db, auto_proc_backup, "backup", "pg_dump")
Rel(auto_proc_backup, auto_s3, "store", "aws s3")

Rel(auto_s3, auto_proc_restore, "retrieve", "aws s3")
Rel(auto_proc_restore, staging_db, "restore", "psql")
Rel(auto_proc_restore, dev_db, "restore", "psql")
Rel(auto_proc_restore, sandbox_db, "restore", "psql")

Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(developer, google_tag_manager, "Configure tags")
Rel(developer, google_analytics, "View traffic statistics")
Rel(personnel, google_analytics, "Sends non-PII traffic data")
Rel(personnel, google_tag_manager, "Sends non-PII tags data")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
Rel(worker_app, clamav, "scans files", "https POST (9443)")
Rel(worker_app, AWS_SES_SMTP_Server, "notifies users", "port 587")
Rel(AWS_SES_SMTP_Server, AWS_SNS, "notifies admin")
Rel(www_app, HSES_DATA, "retrieve Recipient data", "https GET (443)")
Rel(www_app, HSES_AUTH, "authenticates user", "OIDC (Auth Code + PKCE; client auth: private_key_jwt)")
Rel(www_app, www_jwks, "serves", "https GET (443)")
Rel(HSES_AUTH, www_jwks, "fetches public keys", "https GET (443)")
Rel(personnel, HSES_DATA, "verify identity", "https GET/POST (443)")
Rel(www_app, HSES_AUTH, "ends session (RP-initiated logout)", "OIDC end-session")
note right of www_app
- Local session cleared (cookie + server store)
- Browser redirected to HSES end-session
- Returns to post_logout_redirect_uri
end note

BiRel(worker_app, SFTP, "CLASS/Monitoring: collects file", "sftp readdir, createReadStream - SSH (22)")
Rel(worker_app, www_s3, "CLASS/Monitoring: cache file", "vpc endpoint")
Rel(www_s3, worker_app, "CLASS/Monitoring: process file", "vpc endpoint")
Rel(worker_app, www_db, "CLASS/Monitoring: save data", "psql")


Rel(www_app, similarity_api, "request similarity", "https GET (443)")
Rel(personnel, similarity_api, "request similarity", "https GET (443)")
Rel(similarity_api, www_db, "read data for similarity", "psql")

BiRel(www_app, www_db, "reads/writes dataset records", "psql")
BiRel(worker_app, www_db, "reads/writes dataset records", "psql")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
BiRel(worker_app, www_s3, "reads/writes data content", "vpc endpoint")
Rel(www_app, www_redis, "enqueues job parameters", "redis")
BiRel(worker_app, www_redis, "dequeues job parameters & updates status", "redis")
Rel(worker_app, www_redis, "enqueues job parameters", "redis")
BiRel(www_app, www_redis, "Coordinates websocket subscriptions between instances", "redis")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Lay_D(personnel, aws)
Lay_R(HSES_AUTH, aws)
[personnel] -r-> [www_app]

www_app -left- worker_app
worker_app -left- similarity_api
similarity_api -left- clamav

@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com]
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) for syntax help.
