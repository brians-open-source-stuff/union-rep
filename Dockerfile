FROM node:24.16.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm exec prisma generate --schema=prisma/schema.prisma

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
