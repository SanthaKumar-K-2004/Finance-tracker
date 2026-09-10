---
name: daily-finance-auditor
description: Microfinance audit rules, calculation engines, and template guardian for Tamil Nadu daily collection registers (ALR).
---

# 📋 Daily Finance Auditor Skill (தினசரி வசூல் ஆடிட்டர்)

This skill encodes the operational rules, financial arithmetic, and template integrity standards for the Daily Collection Manager.

## 💰 1. Financial Arithmetic & Formulas
All calculations must strictly follow these rules:

1. **Daily Installment Calculation**:
   $$\text{Daily Installment} = \frac{\text{Principal Amount}}{\text{Cycle Days (e.g. 31, 60, 100)}}$$
   *Example:* ₹10,000 ÷ 31 days = ₹322.58/day (or standard ₹100/day for 100-day cycles).

2. **Total Collected Calculation**:
   $$\text{Total Collected} = \sum_{d=1}^{31} \text{Daily Amount}_d$$
   *Matches Excel formula:* `=SUM(G4:AK4)`

3. **Remaining Balance Calculation**:
   $$\text{Remaining} = \max(0, \text{Principal} - \text{Total Collected})$$
   *Matches Excel formula:* `=IF(F4-AL4<0, 0, F4-AL4)`

4. **Excess Amount (Advance Payment)**:
   $$\text{Excess} = \max(0, \text{Total Collected} - \text{Principal})$$
   *Matches Excel formula:* `=IF(AL4-F4>0, AL4-F4, 0)`

5. **Month-End Rollover Rule**:
   * If $\text{Remaining} == 0$: Mark loan as **COMPLETED** (Green highlight). Eligible for 1-click archiving to `closed_clients`.
   * If $\text{Remaining} > 0$: Roll over to Next Month:
     $$\text{Next Month Starting Principal} = \text{Remaining Balance}$$

---

## 📑 2. Excel Template Compliance (`Daily_Collection_Register__ALR_-6.xlsx`)
Whenever reading or generating `.xlsx` files:
- **Col A**: Sl.No (வரிசை எண்)
- **Col B**: Month / Year (மாதம் / வருடம்)
- **Col C**: Name (வாடிக்கையாளர் பெயர்)
- **Col D**: Phone Number (தொலைபேசி எண்)
- **Col E**: Address (முகவரி / ஊர்)
- **Col F**: Principal Amount (அசல் தொகை)
- **Col G - AK (Cols 7-37)**: Days 1 to 31
- **Col AL (Col 38)**: Total (31 Days)
- **Col AM (Col 39)**: Remaining (Principal - Total)
- **Col AN (Col 40)**: Excess (+Amount)
- **Col AO (Col 41)**: Close Date
- **Col AP (Col 42)**: Remaining (Copy -> Paste values next month)

---

## 📱 3. WhatsApp Deep Link Format (`wa.me`)
Zero-cost receipt messages must be formatted as:
```text
வணக்கம் [Client Name],
[Shop Name]-ல் தங்களின் தினசரி வசூல் வரவு வைக்கப்பட்டது.
தேதி: [Date]
வசூல் தொகை: ₹[Amount]
மொத்த வசூல்: ₹[Total Collected]
மீதமுள்ள நிலுவை: ₹[Remaining]
நன்றி!
```
URL Encoding:
`https://wa.me/91[Phone]?text=[EncodedMessage]`
