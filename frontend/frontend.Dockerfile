FROM node:17
WORKDIR /frontend
COPY frontend/package*.json /frontend/
RUN npm install
COPY . /frontend
EXPOSE 5000
CMD ["npm", "start"]