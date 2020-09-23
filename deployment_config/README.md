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
