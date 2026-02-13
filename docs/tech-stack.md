# Technical Details for the TTAHUB

## Backend
- Node.js (22.22.0)
- TypeScript & Javascript (mixed)
- PostgreSQL (15.12) via Sequelize ORM

## Frontend
- React (17)
- Javascript
- USWDS (U.S. Web Design System)

## Testing
- Jest (unit/integration)
- Playwright (E2E)
- Cucumber (BDD)
- Axe (accessibility)

## Infrastructure
- Cloud.gov
- Cloud Foundry
- CircleCI

### Frontend Build Variables

| Variable | Description |
|-|-|
| `REACT_APP_INACTIVE_MODAL_TIMEOUT` | Amount of time before the "Idle Logout" modal is shown to a user, in milliseconds |
| `REACT_APP_SESSION_TIMEOUT` | Amount of time before an inactive user is automatically logged out |

## Other
- Worker Queue: Redis + Bull
- Package Manager: Yarn Classic (v1)
- Scripting: Bash
- Security: ClamAV/OWASP
- Local Dev: Docker
- Documentation: Swagger/Redoc
- Diagrams: PlantUML
