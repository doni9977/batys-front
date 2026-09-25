import re

with open('src/routes/ai.tsx', 'r') as f:
    content = f.read()

# Fix indentation in the strings so it doesn't render weirdly on the frontend
content = re.sub(r'\n          (?=[А-Яа-я•])', r'\n', content)

with open('src/routes/ai.tsx', 'w') as f:
    f.write(content)
