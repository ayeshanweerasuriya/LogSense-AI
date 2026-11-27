
# Use the official Node.js 22 Alpine image.
FROM node:22-alpine

# Set the container environment.
ENV NODE_ENV=production

# Set the working directory.
WORKDIR /app

# Copy package files first for better Docker layer caching.
COPY backend/package*.json ./

# Install production dependencies only.
RUN npm ci --omit=dev

# Copy backend source code.
COPY backend/src ./src

# Expose the backend API port.
EXPOSE 3000

# Start the backend server.
CMD ["node", "src/server.js"]
