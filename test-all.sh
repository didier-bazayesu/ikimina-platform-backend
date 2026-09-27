#!/usr/bin/env bash
set -e

echo "=== Running Backend Tests & Lint ==="
cd ikmn-backend
npm run lint
npm run test
cd ..

echo "=== Running Frontend Lint ==="
cd ikimina-platform-frontend
npm run lint
cd ..

echo "=== All checks passed! ==="
