System Boundary Diagram
=======================

![rendered boundary diagram](https://www.plantuml.com/plantuml/png/jLTVRniv3d_Ff-3beN21ECQbtOSx71Rhn6wQGtBrPjpsONTXQ3JqM1jPcagKNUFGxtxY_54c7IV05TY7n1gE-EEF54bnVl4a78MjFlcRCbA70c53LFb_JYPExCzBHPkG1uzEMaDew5pQxKGKJWcpqw4AawktuuKMXZxUtKwq8FGKHQkhk5ieW-wyOcnIf16Moocy3pdaDfX2k0Fi5EvF5kYyDQEg_Z6ep-2qs_ZHepkDprC3Q8enqm2x1jeahDFNdNw1EzGselJqPvtij2VSHIZh8Ett84m1rykxY7NPCXk9lMUxdpEujhihRKDn-Xh-UmAGTaWMbdONjzNByxXkzm1a1q-uNSs_4YEjXCxxsq1RKOnpeOMHpAqnDBszZ0oUQYShAr6f9n3JnSqBkvqDL4VYNw-qEA3pFyEZQlFIiztQCtZ7Fha3a1FhjPBWqUsKn1R_CIPaS-OgfSD2aI1bJNgRN0T8Pp_Qx_UHUDNdaPBWC-OmhIgjP0t4RFvZ2_ntTWRphvL3xy_W7eKaVZDJlee0pL59gpLAyZLK8KYSmrtGf2gDe8mdZge75unHfenE35XPzu2k9PRerCBd65q6hVbvWMvjtHPo8HzAnwu3ep6jcWbKpaRZ_hXXOOG-a99-HS8_S2XR0IoI6YpZgzhKWJRMdC7CoaYC9TSOGGHXOoc1WGrK1V9734ejje8pz9tI25wAEYISEytXY-tq4wzk3A6BU20UtOVewADANNgXuiGzOcYMrqTTvCpRUYeTPh_UmaoGo8N7BiFlPnalMpKFRKjf3zMiLHbSijslycSj-ZSjTFO6yX03HQT9mAkCh4CFdWH7USrH4DuZFUy3fpQN_Zt_3ZoOQ-4Zaf2RMlHhm81Wr_ry-DFc7iWsUM5DQ-ZR2VzzEscATVJ-VRRAxfQBLOPkLnVgV2kKXkQHeUCEwCk0DX6_tC2DisPX7KNW3YoRPr63VsgVbIarGgPA0n_Cx-RktHHsIi1IRN5yAJmMdELW7InkFe4KhlWzxifiSBBsvTe9GuYrx_sMM7gnya9uDY54rXPyh_kKraR3AnBbQYkCA6k_hciXB4K9TusGEVOUeubl_x-HbFsF9gQTY0rmTqc2eOar5fsPTrZSJ-yMOr5LpkwmWEDs3UuTQYMvAU0UxddT9RComGOFTzOeievhdmt6BVrBgGVGU0vLqqouNS4hqBOieofZrXSmNC-NayM7BFxxk9pCvhVpvHn6Rz--UHtH6Jirrnwomyewya2eSOla3Wn7ikehzaaTFRAhjXGHejmVKneSmIU5-tHzrDN6PTBffglzg6w6fl1Wh1alRcuI2FUueVgGxm20EJ-Z_NWLDyhf0danw6VWKN8qzfXxRiRaOGoViom5rLX2SAhS45W3Mfc7awdM8Dciv7xceS1AIS82X4D08zsXugUzeWqiRpFu-_a51AFHUx2qGRTN7e5nY_CJD4MzP7TIr-kFIuNT6-xCROCZ4dApHKF-YLzFSY25OZWoLCv-LUZ1uPU0dloF1oTP6nX9kVjNMElVx-a6v9lCrm7gcM1u6FtZ6TrXapQMr9hP1jyEK5nkSF5JexsQFT4VNFVAA5A2i3UBoUxw0Txpme6bYBNTtY4vXJk4UvIgKcXecCal0eX0cwZ5jtth4Ej-c4RnnR1qMgKTEhK-W2fOamx3mngOBF8ZWP3M-B15S68F9FBsJFuiSZdwwUsRYqx_UxqqOpGJpoCkZ1IUU-R4QGzUMeUl1v2Ngbz0Jy4JQ3ihzB3RddeaiWapnJOnT2WAFzaxHTXq8uy43YEneiaR_qKdzPGqFuwG2BJU3TMxQOjrTvK4D4LbbQ4XYn-56H3fPYaqiRO3UfwDe19ERB7x0ActF4SX0HHu501UGQWYgNR22qF4utokh7M5ChLYwYJWG-wbKrNJi7EaFQ997nHzx3HBTBSYPrqtJrpTJAvci50LQcLmE4WqNzGyjYZYqRQPzSOSLcUrHXw52woppYko_6Nr540g9pLAnRRgvTNDTuC8Z_DbEqbdwLjkC94a9ekGQ-KtjM66YY_0n-VHHIh5Rc_VkDrk5S76sWT8ZR5Z16J11GDDDAeKZHhi4UIxpziPLjeUddo5M0C-I8dUhuDku1Wu8jsAmshstVNUIE_RaRWM_9Ps_05ZD_uPVcjpue-JNz0KOQl_1m00)

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Hub boundary view
Person(personnel, "TTA Hub User", "An end-user of the TTA Hub")
Person(developer, "TTA Hub Developer", "TTA Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      Container(worker_app, "TTA Hub Worker Application", "NodeJS, Bull", "Perform background work and data processing")
      Container(analytics_task, "Analytic Processing Task", "Python, Docker", "Generate data analytics outputs")
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for the TTA Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")
    }
  }
}
System(HHS_SMTP_Server, "Email Server", "HHS Email Server through IronPort")
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "SaaS") {
  System_Ext(google_tag_manager, "Google Tag Manager", "Tag Manager")
}
Boundary(gsa_saas, "SaaS") {
  System_Ext(google_analytics, "Google Analytics", "Web Analytics")
}
Boundary(gsa_fed_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
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
Rel(worker_app, HHS_SMTP_Server, "notifies users", "port 25")
Rel_D(worker_app, analytics_task, "initiate cloud.gov container tasks", "https GET (443)")
Rel(www_app, HSES, "retrieve Recipient data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_db, analytics_task, "consume raw tables", "jdbc(5432)")
Rel(analytics_task, www_db, "output analytics (ie.sentiment score)", "jdbc(5432)")
BiRel(www_s3, analytics_task, "output static analytics reports", "https GET (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql")
BiRel(worker_app, www_db, "reads/writes dataset records", "psql")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
BiRel(worker_app, www_s3, "reads/writes data content", "vpc endpoint")
Rel(www_app, www_redis, "enqueues job parameters", "redis")
BiRel(worker_app, www_redis, "dequeues job parameters & updates status", "redis")
BiRel(www_app, www_redis, "Coordinates websocket subscriptions between instances", "redis")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Lay_D(personnel, aws)
Lay_R(HSES, aws)
[personnel] -r-> [www_app]
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](https://www.plantuml.com/plantuml/png/jLTVRniv3d_Ff-3beN21ECQbtOSx71Rhn6wQGtBrPjpsONTXQ3JqM1jPcagKNUFGxtxY_54c7IV05TY7n1gE-EEF54bnVl4a78MjFlcRCbA70c53LFb_JYPExCzBHPkG1uzEMaDew5pQxKGKJWcpqw4AawktuuKMXZxUtKwq8FGKHQkhk5ieW-wyOcnIf16Moocy3pdaDfX2k0Fi5EvF5kYyDQEg_Z6ep-2qs_ZHepkDprC3Q8enqm2x1jeahDFNdNw1EzGselJqPvtij2VSHIZh8Ett84m1rykxY7NPCXk9lMUxdpEujhihRKDn-Xh-UmAGTaWMbdONjzNByxXkzm1a1q-uNSs_4YEjXCxxsq1RKOnpeOMHpAqnDBszZ0oUQYShAr6f9n3JnSqBkvqDL4VYNw-qEA3pFyEZQlFIiztQCtZ7Fha3a1FhjPBWqUsKn1R_CIPaS-OgfSD2aI1bJNgRN0T8Pp_Qx_UHUDNdaPBWC-OmhIgjP0t4RFvZ2_ntTWRphvL3xy_W7eKaVZDJlee0pL59gpLAyZLK8KYSmrtGf2gDe8mdZge75unHfenE35XPzu2k9PRerCBd65q6hVbvWMvjtHPo8HzAnwu3ep6jcWbKpaRZ_hXXOOG-a99-HS8_S2XR0IoI6YpZgzhKWJRMdC7CoaYC9TSOGGHXOoc1WGrK1V9734ejje8pz9tI25wAEYISEytXY-tq4wzk3A6BU20UtOVewADANNgXuiGzOcYMrqTTvCpRUYeTPh_UmaoGo8N7BiFlPnalMpKFRKjf3zMiLHbSijslycSj-ZSjTFO6yX03HQT9mAkCh4CFdWH7USrH4DuZFUy3fpQN_Zt_3ZoOQ-4Zaf2RMlHhm81Wr_ry-DFc7iWsUM5DQ-ZR2VzzEscATVJ-VRRAxfQBLOPkLnVgV2kKXkQHeUCEwCk0DX6_tC2DisPX7KNW3YoRPr63VsgVbIarGgPA0n_Cx-RktHHsIi1IRN5yAJmMdELW7InkFe4KhlWzxifiSBBsvTe9GuYrx_sMM7gnya9uDY54rXPyh_kKraR3AnBbQYkCA6k_hciXB4K9TusGEVOUeubl_x-HbFsF9gQTY0rmTqc2eOar5fsPTrZSJ-yMOr5LpkwmWEDs3UuTQYMvAU0UxddT9RComGOFTzOeievhdmt6BVrBgGVGU0vLqqouNS4hqBOieofZrXSmNC-NayM7BFxxk9pCvhVpvHn6Rz--UHtH6Jirrnwomyewya2eSOla3Wn7ikehzaaTFRAhjXGHejmVKneSmIU5-tHzrDN6PTBffglzg6w6fl1Wh1alRcuI2FUueVgGxm20EJ-Z_NWLDyhf0danw6VWKN8qzfXxRiRaOGoViom5rLX2SAhS45W3Mfc7awdM8Dciv7xceS1AIS82X4D08zsXugUzeWqiRpFu-_a51AFHUx2qGRTN7e5nY_CJD4MzP7TIr-kFIuNT6-xCROCZ4dApHKF-YLzFSY25OZWoLCv-LUZ1uPU0dloF1oTP6nX9kVjNMElVx-a6v9lCrm7gcM1u6FtZ6TrXapQMr9hP1jyEK5nkSF5JexsQFT4VNFVAA5A2i3UBoUxw0Txpme6bYBNTtY4vXJk4UvIgKcXecCal0eX0cwZ5jtth4Ej-c4RnnR1qMgKTEhK-W2fOamx3mngOBF8ZWP3M-B15S68F9FBsJFuiSZdwwUsRYqx_UxqqOpGJpoCkZ1IUU-R4QGzUMeUl1v2Ngbz0Jy4JQ3ihzB3RddeaiWapnJOnT2WAFzaxHTXq8uy43YEneiaR_qKdzPGqFuwG2BJU3TMxQOjrTvK4D4LbbQ4XYn-56H3fPYaqiRO3UfwDe19ERB7x0ActF4SX0HHu501UGQWYgNR22qF4utokh7M5ChLYwYJWG-wbKrNJi7EaFQ997nHzx3HBTBSYPrqtJrpTJAvci50LQcLmE4WqNzGyjYZYqRQPzSOSLcUrHXw52woppYko_6Nr540g9pLAnRRgvTNDTuC8Z_DbEqbdwLjkC94a9ekGQ-KtjM66YY_0n-VHHIh5Rc_VkDrk5S76sWT8ZR5Z16J11GDDDAeKZHhi4UIxpziPLjeUddo5M0C-I8dUhuDku1Wu8jsAmshstVNUIE_RaRWM_9Ps_05ZD_uPVcjpue-JNz0KOQl_1m00)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) for syntax help.
