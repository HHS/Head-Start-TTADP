FROM node:18.19.1
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
