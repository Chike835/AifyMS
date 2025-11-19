#!/bin/bash

# Aify Global ERP v2.0 - Folder Structure Setup Script
# This script creates the complete directory structure as defined in the specification

set -e

echo "Creating Aify Global ERP folder structure..."

# Backend structure
mkdir -p backend/src/config
mkdir -p backend/src/controllers
mkdir -p backend/src/models
mkdir -p backend/src/routes
mkdir -p backend/src/middleware
mkdir -p backend/src/services

# Frontend structure
mkdir -p frontend/src/components/common
mkdir -p frontend/src/components/pos
mkdir -p frontend/src/components/admin
mkdir -p frontend/src/pages
mkdir -p frontend/src/context
mkdir -p frontend/src/hooks
mkdir -p frontend/src/utils

# Database directory
mkdir -p database

echo "Folder structure created successfully!"
echo ""
echo "Directory structure:"
echo "  backend/src/{config,controllers,models,routes,middleware,services}"
echo "  frontend/src/{components/{common,pos,admin},pages,context,hooks,utils}"
echo "  database/"

