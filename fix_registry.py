import re

with open('src/routes/registry.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update getRiskLevel
old_getRiskLevel = """function getRiskLevel(amount: number): RiskLevel {
  if (amount > 5_000_000) return "high";
  if (amount > 500_000) return "medium";
  return "low";
}"""
new_getRiskLevel = """function getRiskLevel(amount: number, totalRisks: number, domainId: string): RiskLevel {
  if (domainId === "non_residents") {
    if (totalRisks >= 4) return "high";
    if (totalRisks >= 2) return "medium";
    return "low";
  }
  if (amount > 5_000_000) return "high";
  if (amount > 500_000) return "medium";
  return "low";
}"""
text = text.replace(old_getRiskLevel, new_getRiskLevel)

# 2. Update exportCsv
text = text.replace('function exportCsv(subjects: RegistrySubject[]) {', 'function exportCsv(subjects: RegistrySubject[], domainId: string) {')
text = text.replace('RISK_META[getRiskLevel(s.total_amount)].label,', 'RISK_META[getRiskLevel(s.total_amount, s.total_risks, domainId)].label,')

# 3. Update RegistryPage logic
text = text.replace('const totalHigh = subjects.filter((s) => getRiskLevel(s.total_amount) === "high").length;', 'const totalHigh = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "high").length;')
text = text.replace('const totalMedium = subjects.filter((s) => getRiskLevel(s.total_amount) === "medium").length;', 'const totalMedium = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "medium").length;')
text = text.replace('const totalLow = subjects.filter((s) => getRiskLevel(s.total_amount) === "low").length;', 'const totalLow = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "low").length;')

# 4. Update the table render
text = text.replace('const level = getRiskLevel(row.total_amount);', 'const level = getRiskLevel(row.total_amount, row.total_risks, meta.id);')

# 5. Update the exportCsv call
text = text.replace('onClick={() => exportCsv(subjects)}', 'onClick={() => exportCsv(subjects, meta.id)}')

with open('src/routes/registry.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
