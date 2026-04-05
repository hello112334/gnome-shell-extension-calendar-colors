#!/usr/bin/env bash
set -euo pipefail

METADATA="$(dirname "$0")/../metadata.json"

# Read current version
current=$(python3 -c "import json,sys; print(json.load(open('$METADATA'))['version'])")
next=$((current + 1))

echo "Bumping version: $current -> $next"

# Update metadata.json
python3 - <<EOF
import json
path = '$METADATA'
with open(path) as f:
    data = json.load(f)
data['version'] = $next
with open(path, 'w') as f:
    json.dump(data, f, indent=4)
    f.write('\n')
EOF

git add "$METADATA"
git commit -m "chore: bump version to $next"
git tag "v$next"
git push origin master
git push origin "v$next"

echo "Done — pushed v$next"
