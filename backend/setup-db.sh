#!/bin/bash

# Setup database for omnichannel backend
# This script creates the database in Docker PostgreSQL

set -e

echo "🐳 Setting up PostgreSQL database in Docker..."

# Database configuration from .env
DB_NAME="${DATABASE_NAME:-omnichannel_db}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-password}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

# Try to find the PostgreSQL Docker container
CONTAINER_ID=$(docker ps --filter "expose=$DB_PORT" --format "{{.ID}}" | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ No PostgreSQL container found on port $DB_PORT"
  echo "Please start your PostgreSQL Docker container first."
  echo ""
  echo "Example: docker run --name postgres -e POSTGRES_PASSWORD=$DB_PASSWORD -p $DB_PORT:5432 -d postgres:14"
  exit 1
fi

echo "✅ Found PostgreSQL container: $CONTAINER_ID"

# Check if database already exists
DB_EXISTS=$(docker exec $CONTAINER_ID psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
  echo "⚠️  Database '$DB_NAME' already exists!"
  read -p "Do you want to drop and recreate it? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Dropping existing database..."
    docker exec $CONTAINER_ID psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
  else
    echo "✅ Using existing database '$DB_NAME'"
    exit 0
  fi
fi

# Create the database
echo "📦 Creating database '$DB_NAME'..."
docker exec $CONTAINER_ID psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

echo "✅ Database '$DB_NAME' created successfully!"
echo ""
echo "Next steps:"
echo "  npm run migration:run    # Run migrations"
echo "  npm run seed             # Seed initial data"
echo "  npm run dev              # Start development server"
