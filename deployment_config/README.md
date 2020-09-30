# Deployment Configuration Variable Files

Files within this directory contain variables that are read/substituted into
the deployment manifest (manifest.yml). The deployment manifest configures
aspects of the application deployment such as the number of instances deployed
and variables that are passed to the application environment. Environment
variables that should remain secret and outside of version control are
overwritten in the manifest by a deployment command flag, `--var`, in the deploy
job (configured in .circleci/config.yml). See the treatment of `AUTH_CLIENT_SECRET`,
as an example of this variable substitution. For more information on secret
management see the Secret Management section of the main README.md.

## REDIRECT_URI_HOST

Once our localhost OAuth application has it's redirect callback updated this environment
variable can be removed in favor of TTA_SMART_HUB_URI. The values of these two variables
currently match. They are both required for now to ensure the application operates
properly on local development machines.
