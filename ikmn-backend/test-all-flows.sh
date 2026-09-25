#!/bin/bash
set -e

echo "Running all platform tests sequentially..."

scripts=(
  "test-members-flow.sh"
  "test-system-settings-flow.sh"
  "test-obligations-flow.sh"
  "test-contributions-flow.sh"
  "test-penalties-flow.sh"
  "test-withdrawals-flow.sh"
  "test-reports-flow.sh"
  "test-dashboards-flow.sh"
  "test-statements-flow.sh"
  "test-notifications-flow.sh"
  "test-audit-logs-flow.sh"
  "test-full-platform-flow.sh"
)

for script in "${scripts[@]}"; do
  if [ -f "$script" ]; then
    echo "=========================================="
    echo "Running $script..."
    echo "=========================================="
    bash "$script" || { echo "❌ $script failed!"; exit 1; }
    echo "✅ $script passed!"
    echo ""
  else
    echo "⚠️ Skipping $script (not found)"
  fi
done

echo "🎉 All test scripts executed successfully! The project is running efficiently."
