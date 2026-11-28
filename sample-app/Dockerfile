
# Use the official Node.js 22 Alpine image.
FROM node:22-alpine

# Set the container environment.
ENV NODE_ENV=production

# Set the working directory.
WORKDIR /app

# Copy application source and assign ownership to the node user.
COPY --chown=node:node sample-app/src ./src

# Run the application as a non-root user.
USER node

# Start the sample log generator.
CMD ["node", "src/index.js"]
