FROM node:23.5
WORKDIR /app
COPY shared ../shared
COPY . .
RUN npm install -g nodemon
CMD ["nodemon", "server.js"]
