#!/bin/bash

echo -e "\033[0;36mStarting multi-commit process...\033[0m"

# 1. Commit the backend restructure and modifications
echo -e "\n\033[0;33m[1/3] Staging backend folder restructure...\033[0m"
# Add the deletions from the root folder (src, config, test scripts, etc.)
git add -u .
# Add the new ikmn-backend folder
git add ikmn-backend/
git commit -m "chore: migrate backend code into dedicated ikmn-backend workspace"
echo -e "\033[0;32mBackend commit successful!\033[0m"

# 2. Commit the frontend application
echo -e "\n\033[0;33m[2/3] Staging frontend application...\033[0m"
git add ikimina-platform-frontend/
git commit -m "feat: initialize and implement ikimina-platform-frontend React application"
echo -e "\033[0;32mFrontend commit successful!\033[0m"

# 3. Commit any remaining files (like scripts, readmes, etc)
echo -e "\n\033[0;33m[3/3] Staging remaining files...\033[0m"
git add .
if ! git diff --cached --quiet; then
    git commit -m "chore: add root project utility scripts"
    echo -e "\033[0;32mRemaining files committed!\033[0m"
else
    echo -e "\033[0;32mNo remaining files to commit.\033[0m"
fi

echo -e "\n\033[0;36mAll commits completed successfully!\033[0m"
# Uncomment below if you want to push all the new commits at once
# git push
