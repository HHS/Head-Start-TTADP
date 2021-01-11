# Deployment Configuration Variable Files

Files within this directory contain variables that are both public and read/substituted into the deployment manifest (manifest.yml) based on the deployment environment. For an example, see the treatment of `instances` in dev_vars.yml, prod_vars.yml, and manifest.yml.

**Need to add a public env variable to the application that _does not change_ between envs?** You can add it directly under `env:` in manifest.yml. See `NODE_ENV` as an example.

**Need to add a secrete env variable to the application or a public or secret env variable that _changes_ between envs?** Check out the "Adding environment variables to an application" section in the main README.MD.

## REDIRECT_URI_HOST

Once our localhost OAuth application has it's redirect callback updated this environment
variable can be removed in favor of TTA_SMART_HUB_URI. The values of these two variables
currently match. They are both required for now to ensure the application operates
properly on local development machines.
