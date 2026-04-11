FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN apk add --no-cache libstdc++ \
	&& apk add --no-cache --virtual .node-gyp python3 make g++ \
	&& npm ci --omit=dev \
	&& npm cache clean --force \
	&& apk del .node-gyp

COPY --from=build /app/dist ./dist
COPY --from=build /app/doc ./doc

RUN chown -R node:node /app

USER node

EXPOSE 4000

CMD ["node", "dist/main"]
