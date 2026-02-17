FROM node:22.22.0

WORKDIR /workspace

# Tools required by existing test and coverage workflows.
RUN apt-get update \
  && apt-get install -y --no-install-recommends lcov git \
  && rm -rf /var/lib/apt/lists/*

COPY docker/scripts/ensure-deps.sh /usr/local/bin/ensure-deps.sh
RUN chmod +x /usr/local/bin/ensure-deps.sh
