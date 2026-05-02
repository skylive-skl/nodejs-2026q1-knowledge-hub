FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate


FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN apk add --no-cache libstdc++ \
  && apk add --no-cache --virtual .node-gyp python3 make g++ \
  && npm ci --include=dev \
  && npm cache clean --force \
  && apk del .node-gyp

COPY --from=build /app/dist ./dist
COPY --from=build /app/doc ./doc
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/scripts ./scripts

RUN chmod +x ./scripts/docker-entrypoint.sh \
  && chown -R node:node /app

USER node

EXPOSE 4000

CMD ["sh", "./scripts/docker-entrypoint.sh"]
