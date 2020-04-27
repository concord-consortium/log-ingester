FROM node:12

WORKDIR /log-ingester
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]