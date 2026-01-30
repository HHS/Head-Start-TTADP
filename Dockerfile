# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NODE_ENV=development \
    YARN_CACHE_FOLDER=/app/.yarn/cache \
    PATH="/app/node_modules/.bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    dumb-init \
    git \
    make \
    g++ \
    python3 \
    postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/entrypoint.sh"]

CMD ["bash"]
