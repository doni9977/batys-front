with open('src/routes/registry.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('domainId === "non_residents"', 'domainId === "nr"')

with open('src/routes/registry.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
