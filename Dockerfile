FROM node:20.15.1
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
