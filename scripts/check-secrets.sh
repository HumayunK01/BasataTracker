#!/bin/bash
# Pre-commit hook to prevent committing secrets
# Install: cp scripts/check-secrets.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

echo "🔍 Scanning for potential secrets in staged files..."

# Pattern list for common secret formats
PATTERNS=(
  'SUPABASE_SERVICE_ROLE_KEY'
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'  # JWT signature
  'supabase.co.*key'
  'password\s*[:=]'
  'secret\s*[:=]'
  'token\s*[:=]'
  'api[_-]?key'
)

# Check staged files
FOUND_SECRETS=0
for pattern in "${PATTERNS[@]}"; do
  if git diff --cached -i --name-only -S "$pattern" | grep -v 'SECURITY.md\|.env.example'; then
    echo "⚠️  Found potential secret pattern: $pattern"
    FOUND_SECRETS=1
  fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo ""
  echo "❌ Secrets detected in staged changes. Do not commit these files!"
  echo "   Remove secrets and try again."
  exit 1
fi

echo "✅ No obvious secrets detected"
exit 0
