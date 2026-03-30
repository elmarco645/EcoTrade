# EcoTrade Git Workflow Guide

## 📋 Current Setup
- **Repository**: Single `main` branch (consolidated)
- **Status**: All branches merged, clean working tree
- **Remote**: Synced with `origin/main`

---

## 🔄 Daily Workflow (Smooth Syncing)

### 1. START YOUR WORKDAY
```bash
# Pull latest changes from remote
git pull origin main

# Create a feature branch for your work (optional but recommended)
git checkout -b feature/your-feature-name
```

### 2. MAKE CHANGES
```bash
# Make your code changes...
# Edit files as needed
```

### 3. COMMIT CHANGES
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Brief description of changes

- Detailed explanation of what changed
- Why you made this change
- Any related issues"
```

### 4. PUSH TO REMOTE
```bash
# Push your feature branch
git push origin feature/your-feature-name

# Or if on main:
git push origin main
```

### 5. BEFORE MERGING BACK TO MAIN
```bash
# Fetch latest changes
git fetch origin

# Rebase on main to avoid merge conflicts
git rebase origin/main

# If conflicts occur:
# - Resolve conflicts in files
# - Stage resolved files: git add .
# - Continue rebase: git rebase --continue

# Push rebased changes
git push origin feature/your-feature-name --force-with-lease
```

---

## ⚠️ SECURITY RULES (ENFORCED)

### ❌ DO NOT COMMIT
- Firebase credentials (`.json` files with keys)
- API keys or secrets
- `.env` files (use `.env.example` instead)
- `.hintrc` or IDE configs with sensitive data
- Private keys or tokens

### ✅ DO COMMIT
- `.env.example` (template only, with dummy values)
- `package.json` and `package-lock.json`
- Configuration files without secrets
- `.gitignore` updates

### Files Explicitly Ignored (Auto-Blocked)
```
*-firebase-adminsdk-*.json  # Firebase service accounts
.env                        # Environment variables
.hintrc                     # IDE configs
credentials.json            # Any credential files
secrets.json                # Secret configs
```

---

## 🔧 SAFE MERGE PROCESS (If using branches)

### Merge to Main (Recommended Process)
```bash
# 1. Switch to main
git checkout main

# 2. Pull latest main
git pull origin main

# 3. Merge your feature branch
git merge --no-ff feature/your-feature-name

# 4. Push to remote
git push origin main

# 5. Delete old feature branch (optional)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## 🚨 EMERGENCY PROCEDURES

### If you accidentally pushed secrets:
```bash
# 1. Contact admin - secrets may be exposed
# 2. Rotate credentials immediately
# 3. Remove secret from repository:
git rm --cached secret-file.json
git add .gitignore
git commit -m "security: Remove exposed credentials"
git push origin main
```

### If you have merge conflicts:
```bash
# Option 1: Resolve manually
# - Edit conflicted files
# - Look for <<<<< ===== >>>>> markers
# - Choose correct version
# - git add .
# - git commit

# Option 2: Abort merge and start over
git merge --abort
git pull origin main
```

### If you need to undo last commit:
```bash
# If not pushed yet:
git reset --soft HEAD~1  # Keep changes
git reset --hard HEAD~1  # Discard changes

# If already pushed:
git revert HEAD
git push origin main
```

---

## 📊 Current Repository Status

**Consolidated on**: March 31, 2026  
**Branch**: `main` only  
**Remote Status**: Up to date  
**Working Tree**: Clean  

### Latest Changes
- Firebase authentication config fixed
- Wallet component error handling improved
- Search functionality enhanced with safe JSON parsing
- All merge conflicts resolved
- Credentials removed from version control

---

## 💡 BEST PRACTICES

1. **Commit Frequently**: Small, focused commits are easier to review and revert
2. **Use Descriptive Messages**: Write clear commit messages explaining the "why"
3. **Pull Before Push**: Always `git pull` before pushing to avoid conflicts
4. **Never Force Push**: Use `--force-with-lease` instead (safer)
5. **Check Status**: Run `git status` before committing
6. **Review Changes**: Use `git diff` to review changes before staging

---

## 🎯 COMMIT MESSAGE FORMAT

### Good Example:
```
feat: Add error handling to Wallet page

- Display error state when API fails
- Add retry button for failed requests
- Improve user experience with loading states

Resolves: #123
```

### Commit Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `style` - Formatting/style changes
- `docs` - Documentation updates
- `test` - Test additions
- `chore` - Maintenance tasks
- `security` - Security fixes

---

## 📱 QUICK COMMANDS

```bash
# Check status
git status

# See recent commits
git log --oneline -10

# See changes you made
git diff

# Stage specific files
git add path/to/file

# Unstage files
git reset path/to/file

# Create feature branch
git checkout -b feature/name

# Switch branches
git checkout main

# List branches
git branch -a

# Delete local branch
git branch -d feature/name

# Delete remote branch
git push origin --delete feature/name
```

---

## 🆘 NEED HELP?

Check git status for guidance:
```bash
git status
```

It will tell you:
- What branch you're on
- What files are changed
- What files are staged
- Suggested next commands

---

**Last Updated**: March 31, 2026  
**Repository**: EcoTrade  
**Owner**: elmarco645
