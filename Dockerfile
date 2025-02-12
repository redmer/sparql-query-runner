FROM node:20-slim

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node
COPY --chown=node:node . .

RUN npm ci

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

ENTRYPOINT ["node", "dist/cli/cli.js"]
