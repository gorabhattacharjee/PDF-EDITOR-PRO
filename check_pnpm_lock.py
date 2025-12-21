
import os

lock_path = r"c:\pdf-editor-pro\pnpm-lock.yaml"

if not os.path.exists(lock_path):
    print("Lockfile not found")
else:
    with open(lock_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('/next@') or line.startswith('/react@') or 'react-server-dom' in line:
                print(line)
            if line.startswith('next:'):
                print(line)
