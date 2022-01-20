FROM node:17
WORKDIR /backend
COPY backend/package*.json /backend/
RUN npm install
COPY . /backend
EXPOSE 8080
CMD ["npm", "start"]

