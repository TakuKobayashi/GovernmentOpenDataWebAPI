FROM node:18.20.2-slim
COPY ./ /app
WORKDIR /app

RUN apt update
RUN apt install -y default-mysql-client git
RUN yarn install