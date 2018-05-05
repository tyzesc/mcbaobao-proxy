FROM node:latest
COPY . /tyze-mcbaobao-proxy
WORKDIR /tyze-mcbaobao-proxy
CMD npm install && npm start