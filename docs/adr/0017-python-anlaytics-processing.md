# Python Analytics Processing

## Status: Proposed

## Context

Our team has developed a natural language processing model for the identifying duplicate goals using python. We need to productionize this model and deploy it to our cloud infrastructure on cloud.gov, which has specific technical limitations. We had two design options to consider that can operate without considerable changes to infrastructure. Option1 - containerizing the Python code and deploying it using cloud.gov's underlining infrastructure technology with the use of Cloud Foundry's Docker support. Option 2(view raw markdown to see proposal): The second option would be to spawn a node child processes to execute the python code on the existing node workers. The first option would require additional effort to set up the Docker environment and ensure that the code runs correctly within the container, and data sources (S3 and Posrgres) are securely connected, but it would also encapsulate the code into its own runtime, making it easier to manage and deploy. The second option would be easier to implement, but it would also introduce additional complexity to the deployment process and increase the boundary between the application and the infrastructure. We have decided to go with the first option, as it is appears as a reliable and scalable option for our production environment and should add unnecessary complexity to the user experience.

## Alternatives Considered

We have considered several other alternatives, such as using a serverless architecture, deploying the code as a standalone service, and using Kubernetes. However, we have rejected these alternatives for reasons such as complexity, cost, and mainly lack of compatibility with cloud.gov and its technical limitations. There is also the option of using a different cloud provider which would reduce friction, but we have decided to stick with cloud.gov as the boundary would be too large to change at this point. We have also considered using a different programming language, such as R and node.js, but we have decided to stick with Python as it is the language that the model was developed in and offers the most flexibility in terms of deployment and analytics development options.

## Stakeholders

Stakeholders involved in the process include developers/operations teams, data scientists, and business stakeholders. Their requirements include scalability, reliability, ease of deployment, and compliance with cloud.gov technical limitations.

## Pros and Cons

### Containerization

Cloud.gov does support application deploys <https://cloud.gov/docs/deployment/docker/> there are two flavors to run applications outside the buildpack method "Docker as tasks" and" Docker as app" but we have not tested this yet. We will need to have tested the deployment of a containerized Python application using Cloud Foundry's Docker support to correctly weigh the options. "Docker as task" is the most likely option for us to use, static analytic processing can be run as a task and the results can be stored in a database or S3 bucket. These tasks can be run on a schedule or on demand either through the TTA Hub app's node workers or CircleCi's continuous integration with the cloud.gov api. The "Docker as app" option is more suited for a web application that needs to be available to users, which could be an option for the future if near-time analytics are needed to be asynchrously processed via user input and displayed to users back in the TTA Hub app.

 Containerization is a viable option for our use case, but it does have some drawbacks.


**Pros**

* Encapsulates the code into its own runtime, making it easier to manage and deploy.
* Separates the code from other components of the system.
* Well-established practice for deploying applications in a cloud environment.
* Widely supported by most cloud providers.
* Reliable and scalable option for our production environment.
* Can build container images and run containers on local workstation.
Fine-grained control over compilation and root filesystem.
* Docker containers are portable and can be easily moved between environments.

**Cons**

* Requires additional effort to set up the Docker environment and ensure that the code runs correctly within the container.
* May require additional resources and expertise.
* Potential complexity introduced to the deployment process.
* Docker environment may not be properly configured, which could lead to security vulnerabilities or other issues.
* Added responsibility for all security updates and bug fixes.
* More compliance responsibility means more work.
* Increases boundary between the application and the infrastructure.
* May need additional ATO for Docker container.
* Non-standard deployment process for Docker containers (cloud.gov documents that "No Docker components are involved in this process - your applications are run under the garden-runc runtime")

### Dockerfile
Dockerfile sets up a containerized environment with all the necessary dependencies for running a Python application. This example uses multi-stage builds to separate the build and install stages from the final stage. The final stage uses the distroless image, which is a minimal image that only contains the Python runtime and the application code, providing a secure and lightweight environment for running Python applications. This image is based on the Debian 11 (bullseye) image, which is the latest version of Debian. The `python_build` stage installs the necessary dependencies for building the Python application, such as gcc and python3-dev. The `python_install` stage installs the Python dependencies using pip. The final stage copies the application code and the Python dependencies from the previous stage and sets the environment variables. The final stage also sets the working directory and the command to run the application.

```Dockerfile
DOCKERFILE

ARG PYTHON_VERSION=3.9

# Python build stage
FROM python:${PYTHON_VERSION}-slim-bullseye as python_build
WORKDIR /opt/venv
RUN apt-get update && apt-get install -y gcc python3-dev --no-install-recommends
COPY  ./ops/dev-stack/py_app/src/requirements.txt .
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python3 -m venv $VIRTUAL_ENV && \
    $VIRTUAL_ENV/bin/python3 -m pip install -U --upgrade pip && \
    $VIRTUAL_ENV/bin/pip install --upgrade pip setuptools wheel psutil

# Python install stage
FROM  python_build as python_install
# Use buildkit to cache pip dependencies
# https://pythonspeed.com/articles/docker-cache-pip-downloads/
RUN --mount=type=cache,target=/root/.cache \ 
        $VIRTUAL_ENV/bin/python3 -m pip install -U --no-cache-dir -r requirements.txt --prefer-binary -v 

# Final stage 
# FROM gcr.io/distroless/python3-debian11:debug
FROM gcr.io/distroless/python3-debian11
ENV PYTHON_VERSION=3.9

COPY  ./ops/dev-stack/py_app/src /opt/venv
COPY --from=python_install /opt/venv/ /opt/venv/
COPY --from=python_install /usr/lib/ /usr/lib/

ENV SPARK_HOME=/opt
ENV PATH=$PATH:/opt/bin
ENV PATH /opt/venv/bin:$PATH

WORKDIR /opt/venv
CMD ["python3", "/app.py"]
```

### CI/CD
* Create a CircleCI Docker build of models REPO/IMAGE:TAG
* Deploy Data Analytics Model Container cloud.gov container registry with CircleCI
* Ensure that container images dependencies are up to date with Snyk

Example of a CircleCI config.yml file for building and deploying a Docker image to cloud.gov

```yaml
...
cf_dam_deploy:
    description: "Login to cloud foundry space with service account credentials
      and push application using deployment configuration file."
    parameters:
      app_name:
        description: "Name of Cloud Foundry cloud.gov application; must match
          application name specified in manifest"
        type: string
      auth_client_id:
        description: "Name of CircleCi project environment variable that
          holds authentication client id, a required application variable"
        type: env_var_name
      cloudgov_username:
        description: "Name of CircleCi project environment variable that
          holds deployer username for cloudgov space"
        type: env_var_name
      cloudgov_password:
        description: "Name of CircleCi project environment variable that
          holds deployer password for cloudgov space"
        type: env_var_name
      cloudgov_space:
        description: "Name of CircleCi project environment variable that
          holds name of cloudgov space to target for application deployment"
        type: env_var_name
      deploy_config_file:
        description: "Path to deployment configuration file"
        type: string
      session_secret:
        description: "Name of CircleCi project environment variable that
          holds session secret, a required application variable"
        type: env_var_name
      new_relic_license:
        description: "Name of CircleCI project environment variable that
          holds the New Relic License key, a required application variable"
        type: env_var_name
    steps:
      - run:
          name: Login with service account
          command: |
            cf login -a << pipeline.parameters.cg_api >> \
              -u ${<< parameters.cloudgov_username >>} \
              -p ${<< parameters.cloudgov_password >>} \
              -o << pipeline.parameters.cg_org >> \
              -s ${<< parameters.cloudgov_space >>}
      - run:
          name: Push Data Analytics Modeling Application with deployment vars
          command: |
            cf push --docker-image data-models REPO/IMAGE:TAG
--strategy rolling \ #not sure if strategy is needed for docker
              --vars-file << parameters.deploy_config_file >> \
              --var AUTH_CLIENT_ID=${<< parameters.auth_client_id >>} \
              --var NEW_RELIC_LICENSE_KEY=${<< parameters.new_relic_license >>} \
              --var SESSION_SECRET=${<< parameters.session_secret >>}
              ...
```
### New Relic
* New Relic is a monitoring tool that can be used to monitor the performance of the application. It can be used to monitor the performance
* 

<!-- ### Node Child Processes

Node.js can run Python scripts using the child_process.spawn() method. This method spawns a child process and returns a stream object that can be used to communicate with the child process. The child process can be a Python script, a Node.js script, or any other executable. While this method is not as straightforward as containerization, it is a viable option for running Python scripts in Node.js. There are a couple blog articles that describe how to run Python scripts in Node.js using the child_process.spawn() method.


* <https://medium.com/@shubhamkumar_6363/how-to-run-a-python-script-using-node-js-using-python-shell-34500593d050>

* <https://www.geeksforgeeks.org/run-python-script-node-js-using-child-process-spawn-method/>

**Pros**

* Does not require containerization or Docker setup.
* Can be more straightforward to set up and deploy.
* Can use existing Node.js infrastructure.
  
**Cons**

* Entangles two different programming languages - Python and Node.
* Difficulties in managing the correct Python environment.
* Code errors and inconsistencies may arise.
* May not be a scalable or reliable option for our production environment.
* May not be a well-established practice for deploying machine learning models. 

The data science models had more memory then what was available to the node workers, making this option not viable. -->
  
### Risks and Mitigation

Risks associated with containerization could include compatibility issues with cloud.gov's technical limitations, difficulty in managing dependencies, and potential security vulnerabilities. Cost controls are not really transparent in using this method, as there is flat rate purchasing of resources. To mitigate these risks, we will conduct thorough testing and monitoring, as well as implement contingency plans for addressing potential issues. We will also consider the costs and resource requirements associated with each approach, including infrastructure costs, developer resources, and maintenance requirements. We aim to choose an approach that is cost-effective and feasible within our available resources.

<!-- Risks associated with using Node child processes could include code errors and inconsistencies, as well as difficulties in managing the correct Python environment. There can also be resource contention for users, as analytics services is not decoupled from application state.  To mitigate these risks, we will design and test the system carefully, and provide thorough documentation and training for developers. -->

## Timeline

We aim to complete the productionize process within four weeks, with key milestones including:

* Setting up the development environment
* Testing and validation ( unit tests, integration tests, etc.)
* Deployment to the production environment
* Monitoring and maintenance

## Cost and Resource Considerations

We will consider the costs and resource requirements associated with each approach, including infrastructure costs, developer resources, and maintenance requirements. We aim to choose an approach that is cost-effective and feasible within our available resources.

## Conclusion

After documenting the pros and cons of each approach, we will carefully evaluate the trade-offs and make a decision that best suits our needs. We will consider factors such as resource availability, expertise, reliability, scalability, and ease of deployment. We will also ensure that our chosen approach complies with cloud.gov's technical limitations.

To comply with cloud.gov's technical limitations, we have updated the proposal to reflect this requirement. We will consider these limitations when evaluating the pros and cons of each approach and when making our final decision. We will also ensure that our approach is compatible with cloud.gov.