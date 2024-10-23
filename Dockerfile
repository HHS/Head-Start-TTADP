FROM node:18.20.3
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
RUN \
    mkdir -p /home/node/.cache/yarn \
    && chown -R node:node /home/node/.cache/yarn \
    && mkdir -p /app/node_modules \
    && chown -R node:node /app/node_modules


