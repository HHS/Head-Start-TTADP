FROM node:18.17.1
WORKDIR /app
RUN apt-get update && apt-get install lcov -y

# Update npm config to use fontawesome pro info
RUN npm config set "@fortawesome:registry" https://npm.fontawesome.com/
RUN npm config set "//npm.fontawesome.com/:_authToken" $FONTAWESOME_TOKEN