FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY vite.config.js tailwind.config.js postcss.config.js ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
