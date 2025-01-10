FROM node:23.5
WORKDIR /app
# Copy shared files first
COPY shared/vocabularies ./src/shared/vocabularies
# Then copy the rest of the application
COPY . .
RUN npm install
CMD ["npm", "start"]
