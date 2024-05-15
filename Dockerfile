FROM node:20.12.2
WORKDIR /app
RUN apt-get update && apt-get install lcov -y
