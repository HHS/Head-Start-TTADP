System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/jLVVRziu4dxFNp6NXo85wXYNzXxkS5Yi4xjf3idMQxdjm-x2eAYnp0j5QZcaNUFG__quaamhaLFW2jn3OcdC-RwFGyuF_qnUE1ygVVONPQGE1SB6-vh-CHuxiRiibT-4F10wQOr7uo-bhSQYS4gOhGvr6D-y6ysrCFxJm_rO2u_aesbr4rSBPT1TrepjbTS8o-K4FeGSSXjC8TmUjWftPtDqPCr5tNmOr6_W_B3m4w4xZ-yJ0sYA4Si0kmQ_ILZdhm_-1MvHsuZIyvyURESzupP2MGTfFO4m1Tmk7oBMTQViGko8URzaS6ktDzg6ulmr_ESC8AsGR2pjDYvh7Y_ZSxS68DkJnser--ePQILqtby6sefYb0ijZ6HjBT7a_ZegUEgTM5QYLayW9lExxwnsDlWc4lzyfSKU7Vq4HzVsIsBUPcVmdlVazk2TMA-L14AtLH8x_6DClCrPgvGE2-M5LzQaRzFM0TBPN-nskoYyxkj8b-0BvZ2fQwra0yHgVh45_Yjx0xEljKEA1x108Jr_CrLKHu3sgAJL6gMd1geGNbp2Gz1UrHf16V8SLG8NZ56cZ9iOgBBk4LqdBCbfZ2yfkWvQy_iStTgw2d8X7ql7MmT6OrcD4gYTZUHqcbXgKGc-CE-LHY0f6eLybErPY6hocP_kZ4TdX0PnL0EHz-ZIP4Ae-HxHa6YQDv4lSbPioPSEir_lOIgyo0NXuS8jfXa_Tcu4NOPtCJPhLGQNkFj9zo8ZlUsWixUG1_c8_ZmP-2dprY41yTsHiEOe22BqB--1Rnfdue8_1pkOQK4HISXDO_erO42mw_xn_Dlc1DwsnsHDH_JjZF--dRMvS_7XGxRA7fRpLOPks-JDh19AG_lAq745z6mSZeXVRk3EMJEtpaVW0rWsow87VpHxLgRK29ag3Nmqlvk7znFOAW5BLU7eMX0MVEd0EfZVVGOfNF5xN9NPu6IpbridZ4TizduaoIhXF6qGFLEa5oOykdwCelbMzWjRIM95GX0l529hqxPVGqfhezwL5-Mg4aQKJJXk6oCiHGaFhP6PUg-Hujl_JX9zzTuhIKUAoS7415mZac58iSRYGFCUYyNaOJuITUti5WiupMjmvr0hoQcDErZmyo47b0as43nOexnrdC5C69VqMqiFeDqvr6r9uA83hq3RieokZDcqKRYTBSVpZrdyzsavdixkPyiPNBnxz_PrH6ViL29xo0vhwpo1HuqLUhTdE2_hlcDVrCaZk-ao627QwPJJu0W-AzmTcm0dAMVNmJSrw9E-6Pg2m5Wpcj_T9H2-VKFteTu106j-mVlOK5ldr0Q-6_GtG2Wv6ZlCoN9f8XZ1bonBGJNM8pXLRZnO0rgPnxE9rY2PLd8P92YmLj9Z0S8Xe95kN_FRJlaDBEyp-Elb5GIZaGYitw3RAK9WtEBo34tHFF9sKh7i3ps5tHakw5rTz5x8JON6qvDzFRa3AHJ3nbyx-rLn6yG_0vAd7mzEOXkGfBlx_s3hT-dKEBa1KXEW7WN3myNVN_0TrdPZlLgpsa3T6CJf1bT_UvwINILtw9t2BS82fQeL6Z-yRZtfGm0H_2PwSIVlMDdtuoIQhuRtktEAMjLw3wfWJxyVHlGqPRynz9J_ibnyH_IrUeAHXWU7eg3npYdMpUw47XnAwuesRlIdJkufw3-Eq1T0Rq-v7uOKzjtM4j0KjLN63rNyACn0o644GHFlTa3YaG9guKI5Xp6wMVAIX0HGu4a0U0MXZgAwmIWC4K_hkR7M5Sgmup6JW49EqgcwBLWv-XsYIMDn7plrqaDNu69pwAStT-ERASnLZLeP73RIzdSXjstbUI9iHwGHXzNnUCuJP870dOoKj_pxu2c0L4vgb8gvciURksUDcAVWiXj0i_IBPD2Hav9voBMYJKFCKF4BeFX-SNNLPKbItIUtLQKyRAnzX5GO3eh0Mt31G1kDEaMZ0Jk2FFkHDiLQs_sJuTqQe20b4gs3Rk4OE2BTY_rg-gozjTP5CqbsXj_IYZzWv4O_mM_TdVZZx6SqHQZqVm40)

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
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for the TTA Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")
    }
  }
}
System(HHS_SMTP_Server, "Email Server", "HHS Email Server through IronPort")
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
System(Smartsheet, "Smartsheet", "Source of OHS data")
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
Rel(www_app, HSES, "retrieve Recipient data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, Smartsheet, "retrieve RNTR data", "https GET (443)")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/png/jLVVRziu4dxFNp6NXo85wXYNzXxkS5Yi4xjf3idMQxdjm-x2eAYnp0j5QZcaNUFG__quaamhaLFW2jn3OcdC-RwFGyuF_qnUE1ygVVONPQGE1SB6-vh-CHuxiRiibT-4F10wQOr7uo-bhSQYS4gOhGvr6D-y6ysrCFxJm_rO2u_aesbr4rSBPT1TrepjbTS8o-K4FeGSSXjC8TmUjWftPtDqPCr5tNmOr6_W_B3m4w4xZ-yJ0sYA4Si0kmQ_ILZdhm_-1MvHsuZIyvyURESzupP2MGTfFO4m1Tmk7oBMTQViGko8URzaS6ktDzg6ulmr_ESC8AsGR2pjDYvh7Y_ZSxS68DkJnser--ePQILqtby6sefYb0ijZ6HjBT7a_ZegUEgTM5QYLayW9lExxwnsDlWc4lzyfSKU7Vq4HzVsIsBUPcVmdlVazk2TMA-L14AtLH8x_6DClCrPgvGE2-M5LzQaRzFM0TBPN-nskoYyxkj8b-0BvZ2fQwra0yHgVh45_Yjx0xEljKEA1x108Jr_CrLKHu3sgAJL6gMd1geGNbp2Gz1UrHf16V8SLG8NZ56cZ9iOgBBk4LqdBCbfZ2yfkWvQy_iStTgw2d8X7ql7MmT6OrcD4gYTZUHqcbXgKGc-CE-LHY0f6eLybErPY6hocP_kZ4TdX0PnL0EHz-ZIP4Ae-HxHa6YQDv4lSbPioPSEir_lOIgyo0NXuS8jfXa_Tcu4NOPtCJPhLGQNkFj9zo8ZlUsWixUG1_c8_ZmP-2dprY41yTsHiEOe22BqB--1Rnfdue8_1pkOQK4HISXDO_erO42mw_xn_Dlc1DwsnsHDH_JjZF--dRMvS_7XGxRA7fRpLOPks-JDh19AG_lAq745z6mSZeXVRk3EMJEtpaVW0rWsow87VpHxLgRK29ag3Nmqlvk7znFOAW5BLU7eMX0MVEd0EfZVVGOfNF5xN9NPu6IpbridZ4TizduaoIhXF6qGFLEa5oOykdwCelbMzWjRIM95GX0l529hqxPVGqfhezwL5-Mg4aQKJJXk6oCiHGaFhP6PUg-Hujl_JX9zzTuhIKUAoS7415mZac58iSRYGFCUYyNaOJuITUti5WiupMjmvr0hoQcDErZmyo47b0as43nOexnrdC5C69VqMqiFeDqvr6r9uA83hq3RieokZDcqKRYTBSVpZrdyzsavdixkPyiPNBnxz_PrH6ViL29xo0vhwpo1HuqLUhTdE2_hlcDVrCaZk-ao627QwPJJu0W-AzmTcm0dAMVNmJSrw9E-6Pg2m5Wpcj_T9H2-VKFteTu106j-mVlOK5ldr0Q-6_GtG2Wv6ZlCoN9f8XZ1bonBGJNM8pXLRZnO0rgPnxE9rY2PLd8P92YmLj9Z0S8Xe95kN_FRJlaDBEyp-Elb5GIZaGYitw3RAK9WtEBo34tHFF9sKh7i3ps5tHakw5rTz5x8JON6qvDzFRa3AHJ3nbyx-rLn6yG_0vAd7mzEOXkGfBlx_s3hT-dKEBa1KXEW7WN3myNVN_0TrdPZlLgpsa3T6CJf1bT_UvwINILtw9t2BS82fQeL6Z-yRZtfGm0H_2PwSIVlMDdtuoIQhuRtktEAMjLw3wfWJxyVHlGqPRynz9J_ibnyH_IrUeAHXWU7eg3npYdMpUw47XnAwuesRlIdJkufw3-Eq1T0Rq-v7uOKzjtM4j0KjLN63rNyACn0o644GHFlTa3YaG9guKI5Xp6wMVAIX0HGu4a0U0MXZgAwmIWC4K_hkR7M5Sgmup6JW49EqgcwBLWv-XsYIMDn7plrqaDNu69pwAStT-ERASnLZLeP73RIzdSXjstbUI9iHwGHXzNnUCuJP870dOoKj_pxu2c0L4vgb8gvciURksUDcAVWiXj0i_IBPD2Hav9voBMYJKFCKF4BeFX-SNNLPKbItIUtLQKyRAnzX5GO3eh0Mt31G1kDEaMZ0Jk2FFkHDiLQs_sJuTqQe20b4gs3Rk4OE2BTY_rg-gozjTP5CqbsXj_IYZzWv4O_mM_TdVZZx6SqHQZqVm40)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
