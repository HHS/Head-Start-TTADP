FROM node:18.20.3
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
