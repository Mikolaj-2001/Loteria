FROM node:latest

ENV PORT=3000
ENV APP_PORT=9076
ENV MONGODB_URI=mongodb://mongo:27017/lottery-random

WORKDIR /Loteria

COPY package.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]