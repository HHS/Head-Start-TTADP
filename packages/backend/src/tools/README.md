## Manual monitoring import

These are the steps to manually import monitoring and generate any Goals associated with new monitoring review findings.

### Prerequisites

- Cloud Foundry CLI (cf CLI) installed.
- SSH access to the tta-smarthub-prod application in cloud.gov.
- Be logged into the production environment using the following command before running the script:

```bash
cf login -a api.fr.cloud.gov --sso
```
and chose the production option (option 2 as of the writing of these instructions)

### Basic command sequence

1. `cf ssh tta-smarthub-prod` to connect to the app
2. `/tmp/lifecycle/shell` to get a shell with the correct environment
3. `node ./build/server/src/tools/importSystemCLI.js download 1` to fetch the next zip file from ITAMS
4. `node ./build/server/src/tools/importSystemCLI.js process 1` to process the contents of the zip file into the database
5. `yarn createMonitoringGoalsCLI` to create any monitoring Goals indicated by the new data

The download and process steps will need to be run once each per day that needs catchup, such as on a Monday after the weekend. Thus, the steps would go: 1,2,3,4,3,4,3,4,5.

### Adding validation via the prod database
These are easiest to do in a separate terminal window alongside the one you're using to run the basic command sequence. Otherwise you would have to exit out of the basic command sequence, run these commands, then go exit out and rerun steps 1 and 2 above in order to resume where you were.

1. `cf connect-to-service tta-smarthub-prod ttahub-prod` to connent to the production database console
2. `SELECT "ftpFileInfo"->>'name' filename ,status, "createdAt" FROM "ImportFiles" ORDER BY 3 DESC LIMIT 4;` to inspect the progress of steps 3 and 4 above
This will show the last four files downloaded. If only step 3 has been run, the process is finished if `status` has reached `COLLECTED`. If step 4 has been run, the process is finished if it reaches `PROCESSED`
3. `SELECT LEFT(r.name,35) recipient, "regionId" region, COUNT(*) cnt FROM "Goals" g JOIN "Grants" gr ON g."grantId" = gr.id JOIN "Recipients" r ON gr."recipientId" = r.id WHERE "createdVia" = 'monitoring' AND g."createdAt" > (NOW() - INTERVAL '1 hour') GROUP BY 1,2 ORDER BY 2,1;` creates a small report of monitoring goals created in the last hour. It is useful after step 5 and looks something like:
```
              recipient              | region | cnt
-------------------------------------+--------+-----
 Municipality of Sandaar             |      2 |   1
 New Yorker Child Service Agency     |      2 |   1
 Island Support Center               |      2 |   1
 Young People's Assistance Refuge    |      3 |   1
 Harborville Jackson Aid Center      |      5 |   1
 Community Services of South Odding  |      5 |   1
 Houndingdon Public School District  |      8 |   1
 Superior Academy                    |      8 |   1
 South Desert Communities            |      8 |   1
 Caperton Public Services, Inc.      |      9 |   1
```
This may be important information OHS will want to know if the import is being run manually for some reason.
