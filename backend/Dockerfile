
# Use the official Node.js 22 Alpine image.
FROM node:22-alpine

# Set the container environment.
ENV NODE_ENV=production

# Set the working directory.
WORKDIR /app

# Copy package files first for better Docker layer caching.
COPY backend/package*.json ./

# Install production dependencies without executing lifecycle scripts.
RUN npm ci --omit=dev --ignore-scripts

# Copy backend source code and assign ownership to the node user.
COPY --chown=node:node backend/src ./src

# Run the application as a non-root user.
USER node

# Expose the backend API port.
EXPOSE 3000

# Start the backend server.
CMD ["node", "src/server.js"]
