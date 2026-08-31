import re

with open('src/routes/ai.tsx', 'r', encoding='utf-8', errors='replace') as f:
    data = f.read()

# Find the start of the bad block and the end of it.
bad_match = re.search(r'const clinicName = risk\.clinic_name \|\| "Неизвес.*?const docName = risk\.doctor_name \? `Врач \$\{risk\.doctor_name\}: ` : "";', data, re.DOTALL)

if bad_match:
    good_text = """const clinicName = risk.clinic_name || "Неизвестно";
      
      const meta = Object.values(indicators).find((g) =>
        g.items.some((item) => item.id === risk.indicator)
      );

      const detailText = (() => {
        const ind = risk.indicator;
        const d = risk.details as any;
        
        const docName = risk.doctor_name ? `Врач ${risk.doctor_name}: ` : "";"""
    data = data.replace(bad_match.group(0), good_text)
    
    with open('src/routes/ai.tsx', 'w', encoding='utf-8') as f:
        f.write(data)
    print("Fixed!")
else:
    print("Not found")
