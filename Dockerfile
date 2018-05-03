FROM node:latest
COPY . /tyze-mcbaobao-proxy
WORKDIR /tyze-mcbaobao-proxy
EXPOSE 8081
CMD npm install && npm start