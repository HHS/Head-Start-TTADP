FROM node:18.18.2
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
