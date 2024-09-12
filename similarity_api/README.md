# Installation

**_You should run this inside of docker._**

For running this outside of docker, you'll want to set up a python environment in which you can install these dependencies. It is, however, more simple to just run this in docker.

- Install `pyenv`.
- In this directory, run `pyenv install`.

You can now use this by prefixing your commands with `pyenv exec`, which will use this version of python. e.g. `pyenv exec pip install -r requirements`.

## Example:

```bash
~/Head-Start-TTADP/similarity_api $ python --version
Python 3.11.3

~/Head-Start-TTADP/similarity_api $ pyenv exec python --version
Python 3.9.2
```

Then, you can start the webserver with:

```bash
cd src
pyenv exec python -m flask run --host=0.0.0.0 --debug
```

The above will fail if you don't have values defined for the environment variables listed in `settings.py`. This is another reason it is recommended to run this in docker.

## Configuring the similarity API on cloud.gov

Consult the similarity API service on Cloud.gov that matches your environment (ex: tta-similarity-api-{{ENV}}). There is an SIMILARITY_API_KEY stored there, under the "variables" information. This same key value pair needs to be present as an environmental variable on the deployed application. The key can be added via the Cloud.gov interface if needed (you will need to restage or redeploy if you change an env).

