# ==========================================
# Stage 1: Build the React + Vite Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code and build config
COPY . .

# Build the production bundle into dist/
RUN npm run build

# ==========================================
# Stage 2: Serve with High-Performance Nginx
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose frontend application port
EXPOSE 8443

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
