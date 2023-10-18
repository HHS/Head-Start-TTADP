FROM node:20.8.1
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
