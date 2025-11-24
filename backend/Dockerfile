FROM node:18-slim

WORKDIR /app

# Use pure JS bcrypt implementation to avoid native module issues
ENV USE_BCRYPT_JS=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
