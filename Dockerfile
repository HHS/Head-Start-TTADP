FROM node:18.16.0
WORKDIR /app
RUN apt-get update && apt-get install lcov -y