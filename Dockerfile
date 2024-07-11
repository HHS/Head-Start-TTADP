FROM node:20.15.0
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
