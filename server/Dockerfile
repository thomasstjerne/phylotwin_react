FROM node:23.5
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Use nodemon for auto-reloading
RUN npm install -g nodemon
CMD ["nodemon", "server.js"]
