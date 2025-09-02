#!/bin/bash
# Deployment script for Team Task Manager

echo "🚀 Starting deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type checking
echo "🔍 Type checking..."
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm run test:unit
npm run test:integration

# Build application
echo "🏗️ Building application..."
npm run build

# Run E2E tests on build
echo "🎭 Running E2E tests..."
npm run test:e2e

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Application URL: https://team-task-manager.vercel.app"
