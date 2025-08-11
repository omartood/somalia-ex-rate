# Use Node.js 18 Alpine for smaller image size
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S sosx && \
    adduser -S sosx -u 1001

# Create app directory and set permissions
RUN mkdir -p /home/sosx/.sosx && \
    chown -R sosx:sosx /home/sosx && \
    chown -R sosx:sosx /app

# Switch to non-root user
USER sosx

# Expose port for WebSocket server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/cli.js rates || exit 1

# Default command
CMD ["node", "dist/cli.js", "help"]

# Labels
LABEL maintainer="Somali Exchange Rates Team"
LABEL version="1.0.0"
LABEL description="Comprehensive Somali Exchange Rates platform with advanced financial features"