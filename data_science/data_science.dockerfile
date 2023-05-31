ARG PYTHON_VERSION=3.9
# Python build stage
FROM python:${PYTHON_VERSION}-slim-bullseye as python_base
WORKDIR /opt/venv
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev apt-utils  && \
    python3 -m venv $VIRTUAL_ENV && \
    $VIRTUAL_ENV/bin/python3 -m pip install -U --upgrade pip --no-cache-dir && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

FROM python_base as python_install
WORKDIR /packages
COPY  ./src/requirements.txt .

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN $VIRTUAL_ENV/bin/pip install --upgrade setuptools wheel psutil cleanpy --no-cache-dir && \
    # $VIRTUAL_ENV/bin/pip install --upgrade torch==${TORCH_VERSION}+cpu torchvision==${TORCHVISION_VERSION}+cpu torchaudio==${TORCHAUDIO_VERSION} --index-url https://download.pytorch.org/whl/cpu --no-cache-dir && \
    $VIRTUAL_ENV/bin/pip install -r requirements.txt --no-cache-dir --target /packages && \
    apt-get purge -y --auto-remove gcc python3-dev apt-utils && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    cleanpy -v -f -a /opt/venv/

# Final stage
FROM gcr.io/distroless/python3-debian11:debug as final
ENV PYTHONPATH=/app:/packages
COPY --from=python_install /packages /packages
# COPY ./src /app #this would be for productio, but the dockercompose mounts the src folder to the container
WORKDIR /app
ENTRYPOINT ["python3"]
CMD ["-m","gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:$PORT", "src.server:app", "--reload", "--log-level", "debug"]
