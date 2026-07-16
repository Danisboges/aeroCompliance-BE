# Gunakan image Node.js berbasis Debian slim agar bisa diinstall dependency Chrome
FROM node:20-slim

# Install dependency Chromium/Chrome untuk Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Konfigurasi agar Puppeteer menggunakan Google Chrome terinstall di OS
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# Copy package.json dan install dependency
COPY package*.json ./
RUN npm install

# Copy Prisma schema dan generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy seluruh file source code
COPY . .

# Expose port backend
EXPOSE 3000

CMD ["node", "src/server.js"]
