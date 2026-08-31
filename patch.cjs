const fs = require('fs');
const file = 'src/routes/ai.tsx';
let data = fs.readFileSync(file, 'utf8');

const badStr = 'const clinicName = risk.clinic_name || "Неизвес        const docName = risk.doctor_name ? `Врач ${risk.doctor_name}: ` : "";';
const goodStr = `const clinicName = risk.clinic_name || "Неизвестно";
      
      const meta = Object.values(indicators).find((g) =>
        g.items.some((item) => item.id === risk.indicator)
      );

      const detailText = (() => {
        const ind = risk.indicator;
        const d = risk.details as any;
        
        const docName = risk.doctor_name ? \`Врач \${risk.doctor_name}: \` : "";`;

data = data.replace(badStr, goodStr);
fs.writeFileSync(file, data, 'utf8');
