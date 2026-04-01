FROM node:20-slim

RUN apt-get update && apt-get install -y openssl python3 make g++

WORKDIR /app

RUN npm install -g turbo pnpm

COPY . .

RUN echo "node-linker=hoisted" > .npmrc

RUN pnpm install --no-frozen-lockfile

RUN pnpm run db:generate
RUN pnpm turbo run build --filter=api...

RUN mkdir -p /app/uploads && \
    if [ -d "apps/api/uploads" ] && [ "$(ls -A apps/api/uploads 2>/dev/null)" ]; then \
    cp -r apps/api/uploads/. /app/uploads/ || true; \
    fi

VOLUME ["/app/uploads"]

ENV NODE_ENV=production
EXPOSE 4040

CMD ["node", "apps/api/dist/main"]