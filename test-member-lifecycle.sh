#!/usr/bin/env bash
set -e

echo "=== Running Member Lifecycle Tests ==="
cd ikmn-backend
npm run test -- src/application/member/member.service.test.ts

echo "=== Member Lifecycle Tests Passed! ==="
