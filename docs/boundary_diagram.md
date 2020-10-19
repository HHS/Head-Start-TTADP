System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/dPLVRnf74C3V-HHJ7Yfi1KwDtPSeYaA0s5GufZvSgwehjBStm2hBxcLd5eogVFVk7iV16RMgAYLcDJlpc_zx7uc5Ox_MhH-KaThd22lcWjubYHFRtbBnocUUq4bh60ttf5qd8dTAc8tsXKy6rzsf5eOVxoQ95ep4GJGV16sX3BfU4TcJ_k_tZxFvqtXsEv-CRaPVXfsB5YlM2BDP7zArS0otFeFCUfCBjuEDmcrhYewiwHJbZq7z1jf7rKT2rmwIlW4qUJV627O1l7h5R5ySE3bkKDj0Qt261scx8Tu4g7LGsn08ayFDx2xmZ6K4GJ0oqkqALjPy2P9MNskGCL0PHHHi2oKPSn0E0VUwcCCsr1HcanH-whq5RpGIWGrXkwqYXCZEUwtWlJosFbKLwOWjnMoVKhYncu6sFczVm5yjW5f3Hk7IRe9QUUo5SwK3aEw8SJqVlN0apONEJjL0Mv5tCw65aQ4IbQF-v5F8jcbTUvcBGZKG_UduNxITzLnM_lsFMkpGqGSuckulAVejCuFFCIUt0tPYiL0I2Dr6IQpunvgmpMAiKZhC5OjOz_gsJXsW7iVEThiDWHUDE9eZ-8GPz8j2ArdYOanVR8w_f6zWz58ufD261nIIuyrGKH4m--6GLckKJ2Km5onwSESrgq8ZA4CSQqlWl37AB6CgpTY6MHbT7ZEQMkAbm_JN2Gm3A1E4XwOy3DDuhCm8giMi8Z0BjVHkNuY5TStS_j4dNLNmz0eoBxyYjsj1FALi7H9GhB24XT9n_0cPQkBtLlp_lRLlVUSs7QN1BlwK9CyhD5oL5Fe40j9zIv_Dixdxt8UD4Z1JQ-n-4eHvx01O1zFnRo252wD-N8GbYJa9GVioaSeqGYf4MlNxPFWCRXrg9MCBSGiFyHp3kRD6iNMX2vLX23nS7eVZnD1XOHqJC6fS8xjT1B0ie7DzVNKHJAFXoGjrNAwrC6A9zJ14k_9fXPlHB9dUf-7FuomPZYQZsQX1gn7dorCu-wBY4E4tZyJqtw5dh2hP_msjxE5zzmF4FiCxkBmKnqOZNLx2iqcIF-vZ-z_-cIIlQrLDoGQTMkn0vT6IT-Vk6udKSTVBub3ab6oTOgIor8GC3gLrEKLOGTyqT7w-ldfxpgY6_vnnsAlJoQi-1kiWFapWO9mCXZ1L1Mfby7m4zn_Ge7YZE6vWN8hRj1lXBZuNSMTpX3XbfDZ6Lwi9aCf9ZL95N-LnC3wilpBUUeAnOLnMAryjLJtH9v-yEfAfpxIYLUcugiVXxjIPNQyLmyhQhs0igqMSa4C4m3Q-Ox3FlgYohs17oAjFnH0BRNSWZeyhX7_afKIYXTSLBe03wIEQtA_rtm00" alt="rendered boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
LAYOUT_WITH_LEGEND()
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
Person(developer, "Smart Hub Developer", "Smart Hub vendor developers and GTM")
note as EncryptionNote
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      }
  }
}
System(HSES, "HSES", "Authentication As a Service")
Boundary(gsa_saas, "Possible SaaS") {
  System_Ext(newrelic, "New Relic", "Monitoring SaaS")
}
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
www_app <-> HSES : **authenticates** \n//[OAuth2]//
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
Rel(www_app, www_s3, "reads/writes data content")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dPLVRnf74C3V-HHJ7Yfi1KwDtPSeYaA0s5GufZvSgwehjBStm2hBxcLd5eogVFVk7iV16RMgAYLcDJlpc_zx7uc5Ox_MhH-KaThd22lcWjubYHFRtbBnocUUq4bh60ttf5qd8dTAc8tsXKy6rzsf5eOVxoQ95ep4GJGV16sX3BfU4TcJ_k_tZxFvqtXsEv-CRaPVXfsB5YlM2BDP7zArS0otFeFCUfCBjuEDmcrhYewiwHJbZq7z1jf7rKT2rmwIlW4qUJV627O1l7h5R5ySE3bkKDj0Qt261scx8Tu4g7LGsn08ayFDx2xmZ6K4GJ0oqkqALjPy2P9MNskGCL0PHHHi2oKPSn0E0VUwcCCsr1HcanH-whq5RpGIWGrXkwqYXCZEUwtWlJosFbKLwOWjnMoVKhYncu6sFczVm5yjW5f3Hk7IRe9QUUo5SwK3aEw8SJqVlN0apONEJjL0Mv5tCw65aQ4IbQF-v5F8jcbTUvcBGZKG_UduNxITzLnM_lsFMkpGqGSuckulAVejCuFFCIUt0tPYiL0I2Dr6IQpunvgmpMAiKZhC5OjOz_gsJXsW7iVEThiDWHUDE9eZ-8GPz8j2ArdYOanVR8w_f6zWz58ufD261nIIuyrGKH4m--6GLckKJ2Km5onwSESrgq8ZA4CSQqlWl37AB6CgpTY6MHbT7ZEQMkAbm_JN2Gm3A1E4XwOy3DDuhCm8giMi8Z0BjVHkNuY5TStS_j4dNLNmz0eoBxyYjsj1FALi7H9GhB24XT9n_0cPQkBtLlp_lRLlVUSs7QN1BlwK9CyhD5oL5Fe40j9zIv_Dixdxt8UD4Z1JQ-n-4eHvx01O1zFnRo252wD-N8GbYJa9GVioaSeqGYf4MlNxPFWCRXrg9MCBSGiFyHp3kRD6iNMX2vLX23nS7eVZnD1XOHqJC6fS8xjT1B0ie7DzVNKHJAFXoGjrNAwrC6A9zJ14k_9fXPlHB9dUf-7FuomPZYQZsQX1gn7dorCu-wBY4E4tZyJqtw5dh2hP_msjxE5zzmF4FiCxkBmKnqOZNLx2iqcIF-vZ-z_-cIIlQrLDoGQTMkn0vT6IT-Vk6udKSTVBub3ab6oTOgIor8GC3gLrEKLOGTyqT7w-ldfxpgY6_vnnsAlJoQi-1kiWFapWO9mCXZ1L1Mfby7m4zn_Ge7YZE6vWN8hRj1lXBZuNSMTpX3XbfDZ6Lwi9aCf9ZL95N-LnC3wilpBUUeAnOLnMAryjLJtH9v-yEfAfpxIYLUcugiVXxjIPNQyLmyhQhs0igqMSa4C4m3Q-Ox3FlgYohs17oAjFnH0BRNSWZeyhX7_afKIYXTSLBe03wIEQtA_rtm00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
