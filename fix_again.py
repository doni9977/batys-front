with open('src/routes/ai.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

bad = """      const meta = Object.values(indicators).find((g) =>
        g.items.some((item) => item.id === risk.indicator)
      );"""

text = text.replace(bad, "")

with open('src/routes/ai.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
