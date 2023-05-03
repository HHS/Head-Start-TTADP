FROM node:16.19.1
WORKDIR /app
RUN apt-get update && apt-get install lcov -y