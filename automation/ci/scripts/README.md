# CF Lambda Deployment Tool

The `cf_lambda.sh` script automates the deployment of applications to Cloud Foundry (CF) and manages tasks such as pushing applications, managing service keys, and handling various app states.

## Features

- **Automated App Deployment**: Streamlines the deployment process for applications using Cloud Foundry.
- **Service Key Management**: Automates the creation and deletion of service keys.
- **Application Lifecycle Management**: Provides functionalities to start, stop, and delete applications as needed.
- **Task Execution and Monitoring**: Facilitates running and monitoring tasks within the deployed applications.
- **Logging**: Enhanced logging capabilities that provide detailed feedback and timestamps for tracking the deployment process.

## Prerequisites

Before using this script, ensure the following prerequisites are met:

- **Cloud Foundry CLI**: Installed and configured with access to your Cloud Foundry environment.
- **jq**: Installed on the system to handle JSON data manipulation.
- **Properly Configured JSON Input**: Input parameters for the script must be provided in JSON format including details such as directory paths, manifest details, and task commands.

## Installation

1. Download the script to your system where you have Cloud Foundry CLI installed.
2. Ensure the script is executable:
   ```bash
   chmod +x cf_lambda.sh
   ```

3. Verify all dependencies mentioned are correctly installed and accessible in your environment.

## Usage

To use this script, you need to provide a JSON input file containing the necessary configuration. Here’s how you can run the script:

```bash
./cf_lambda.sh 'your_json_input_here'
```

### Sample JSON Input

```json
{
  "automation_dir": "./path_to_automation_directory",
  "manifest": "manifest.yml",
  "task_name": "deploy-task",
  "command": "bash deploy_script.sh",
  "args": "argument1 argument2"
}
```

- **automation_dir**: Directory where your automation scripts and manifest file are located.
- **manifest**: Name of the manifest file used by Cloud Foundry to deploy the application.
- **task_name**: A specific name for the task to be executed as part of the app deployment.
- **command**: The command to be executed as a task.
- **args**: Arguments to be passed along with the command.

## Detailed Workflow

1. **Preparation**: Validate and parse the JSON input.
2. **Deployment**: Use the manifest file to push the application to Cloud Foundary.
3. **Task Management**: Execute specified tasks within the context of the deployed application and monitor their execution.
4. **Service Key Handling**: Automatically manage service keys needed for various services like databases or third-party APIs.
5. **Cleanup**: Optionally stop or delete the application post-task execution.

## Logging and Monitoring

Logs provide detailed information including timestamps for each step of the deployment and task execution process, which is crucial for debugging and verifying the deployment.

## Contributions

Contributions to this script are welcome. Please ensure that any modifications maintain the integrity of the deployment processes and include adequate error handling and validation.

## License

Specify the license under which this script is shared (if applicable), ensuring users are aware of their rights to use, modify, and distribute the script.
