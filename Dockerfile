FROM node:20.19.3
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install lcov -y

# Set up permissions for yarn cache and node_modules
RUN mkdir -p /home/node/.cache/yarn && \
    chown -R node:node /home/node/.cache/yarn && \
    mkdir -p /app/node_modules && \
    chown -R node:node /app && \
    chown -R node:node /app/node_modules
