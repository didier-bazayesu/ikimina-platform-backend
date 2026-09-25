#!/bin/bash

echo -e "\033[0;36mStarting multi-commit process for Penalties feature...\033[0m"

# 1. Commit the bug fix
echo -e "\n\033[0;33m[1/3] Staging bug fixes...\033[0m"
git add ikimina-platform-frontend/src/pages/admin/MembersPage.tsx
git commit -m "fix(admin): correct invalid button variant in members page"
echo -e "\033[0;32mFix commit successful!\033[0m"

# 2. Commit the new feature
echo -e "\n\033[0;33m[2/3] Staging Penalties Page feature...\033[0m"
git add ikimina-platform-frontend/src/pages/admin/PenaltiesPage.tsx
git add ikimina-platform-frontend/src/App.tsx
git commit -m "feat(admin): implement penalties dashboard with client-side aggregations"
echo -e "\033[0;32mFeature commit successful!\033[0m"

# 3. Commit remaining files (GEMINI.md, etc)
echo -e "\n\033[0;33m[3/3] Staging remaining files...\033[0m"
git add .
if ! git diff --cached --quiet; then
    git commit -m "docs: add AI assistant rules and guidelines"
    echo -e "\033[0;32mRemaining files committed!\033[0m"
else
    echo -e "\033[0;32mNo remaining files to commit.\033[0m"
fi

echo -e "\n\033[0;36mPushing to remote repository...\033[0m"
git push

echo -e "\n\033[0;36mAll commits completed and pushed successfully!\033[0m"
