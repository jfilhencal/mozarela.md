# Weighted Analysis Template Guide for Veterinarians

## Overview

The Weighted Analysis System allows you to create custom clinical protocols that automatically score differential diagnoses based on matching clinical signs. This is particularly useful for:

- **Standardizing** diagnostic approaches across your clinic
- **Training** new veterinarians with evidence-based protocols
- **Quality control** for consistent patient care
- **Specialty protocols** (e.g., cardiology, internal medicine, emergency)

---

## How the Weighted System Works

1. **You define** a list of conditions/diseases and their associated clinical signs
2. **You assign** a base probability and match weight for each condition
3. **The system** compares the patient's clinical signs against your protocol
4. **Scores are calculated** automatically based on keyword matches
5. **Results are ranked** from highest to lowest probability

**Important**: The AI provides additional clinical context based on patient signalment (breed, age, species) but **does NOT modify your protocol scores**.

---

## CSV Template Structure

The template is a simple CSV (Comma-Separated Values) file with 6 columns:

```csv
Disease,Symptom_Keywords,Base_Probability,Match_Weight,Suggested_Tests,Treatment_Plan
```

### Column Definitions

#### 1. **Disease** (Required)
- **What it is**: The name of the condition/differential diagnosis
- **Format**: Text, no quotes needed unless it contains commas
- **Examples**: 
  - `Pneumonia`
  - `Congestive Heart Failure`
  - `Kennel Cough`
  - `Feline Lower Urinary Tract Disease`

#### 2. **Symptom_Keywords** (Required)
- **What it is**: Keywords/clinical signs associated with this condition
- **Format**: Comma-separated list enclosed in quotes
- **Matching**: Case-insensitive, partial matches work
- **Tips**:
  - Use common abbreviations: `dyspnea`, `PU/PD`, `V+`, `D+`
  - Include variations: `cough,coughing`, `vomit,vomiting,emesis`
  - Add history clues: `boarding history`, `recent adoption`, `outdoor cat`
  - Include physical exam findings: `murmur`, `pale mm`, `tachycardia`

**Examples**:
```csv
"cough,fever,dyspnea,lethargy,crackles,increased lung sounds"
"PU/PD,polydipsia,polyuria,weight loss,polyphagia"
"murmur,cough,exercise intolerance,dyspnea,ascites,syncope"
```

#### 3. **Base_Probability** (Required)
- **What it is**: The starting probability score for this condition (0-100)
- **Format**: Whole number (integer)
- **Guidelines**:
  - Common conditions: 15-25
  - Uncommon but important: 5-15
  - Rare but serious: 1-5
  - Very common/default considerations: 25-35

**Rationale**: Reflects disease prevalence in your patient population before considering specific clinical signs.

#### 4. **Match_Weight** (Required)
- **What it is**: Points added for EACH matching keyword
- **Format**: Whole number (integer)
- **Guidelines**:
  - Highly specific signs: 20-30 points
  - Moderately specific signs: 10-20 points
  - Common/non-specific signs: 5-10 points

**Example Calculation**:
```
Condition: CHF
Base_Probability: 10
Match_Weight: 20
Patient Signs: "cough, murmur, exercise intolerance"
Matched Keywords: cough, murmur, exercise intolerance (3 matches)

Final Score: 10 + (20 × 3) = 70%
```

#### 5. **Suggested_Tests** (Required)
- **What it is**: Diagnostic tests to confirm/rule out this condition
- **Format**: Comma-separated list, can use quotes
- **Examples**:
  - `Chest X-ray, CBC, Chemistry Panel`
  - `Echocardiogram, ProBNP, Thoracic radiographs`
  - `Urinalysis, Urine culture, Abdominal ultrasound`
  - `T4, CBC, Chemistry, Blood pressure`

#### 6. **Treatment_Plan** (Required)
- **What it is**: Initial treatment approach or management plan
- **Format**: Free text, use quotes if it contains commas
- **Tips**: Keep it concise but actionable
- **Examples**:
  - `Furosemide 2mg/kg PO BID, Pimobendan 0.25mg/kg PO BID, ACE inhibitor`
  - `Antibiotics (Doxycycline), Cough suppressants, Isolation for 2 weeks`
  - `IV fluids, Maropitant, NPO 12-24h, Gastric protectants`

---

## Example Template Entries

### Respiratory Cases

```csv
Pneumonia,"cough,fever,dyspnea,lethargy,crackles,nasal discharge",15,20,"Chest X-ray, CBC, Chemistry, Tracheal wash","Broad-spectrum antibiotics, Nebulization, Oxygen support if needed"

Kennel Cough,"dry cough,hacking,retching,boarding history,recent adoption",25,15,"PCR panel for respiratory pathogens, Auscultation","Cough suppressants (Hydrocodone), Isolation 2 weeks, Supportive care"

Congestive Heart Failure,"cough,murmur,exercise intolerance,dyspnea,tachypnea,ascites",10,25,"Echocardiogram, ProBNP, Thoracic radiographs, ECG","Furosemide 2mg/kg BID, Pimobendan 0.25mg/kg BID, ACE inhibitor (Enalapril)"
```

### Gastrointestinal Cases

```csv
Acute Gastroenteritis,"vomiting,diarrhea,lethargy,anorexia,dehydration",30,12,"Fecal exam, Parvovirus test (if puppy), CBC","IV fluids, Maropitant, NPO 12-24h, Metronidazole"

Pancreatitis,"vomiting,anorexia,abdominal pain,diarrhea,lethargy,fever",12,22,"Spec cPL/fPL, Abdominal ultrasound, CBC, Chemistry","NPO, IV fluids, Maropitant, Buprenorphine, Low-fat diet when eating"

Foreign Body,"vomiting,anorexia,abdominal pain,lethargy",8,25,"Abdominal radiographs, Abdominal ultrasound, Contrast study","Surgical exploration vs endoscopy, IV fluids, Pain management"
```

### Endocrine Cases

```csv
Diabetes Mellitus,"PU/PD,polyphagia,weight loss,lethargy,cataracts",15,20,"Fasting glucose, Fructosamine, Urinalysis, Urine culture","Insulin (starting 0.25-0.5 U/kg BID), Diet change, Glucose curve in 7-10 days"

Hyperthyroidism,"weight loss,polyphagia,PU/PD,hyperactivity,vomiting,diarrhea,tachycardia",18,18,"Total T4, Free T4, CBC, Chemistry, Blood pressure","Methimazole 2.5mg PO BID, Recheck T4 in 2-3 weeks, Monitor renal function"

Cushing's Disease,"PU/PD,polyphagia,pot-bellied,alopecia,thin skin,muscle wasting",10,20,"ACTH stim test or LDDST, CBC, Chemistry, Urinalysis, Urine culture","Trilostane starting dose, ACTH stim monitoring, Treat concurrent infections"
```

---

## Best Practices

### 1. **Start Broad, Then Specialize**
Begin with common differentials that cover 80% of your cases, then add specialty conditions as needed.

### 2. **Balance Your Weights**
- Don't make everything high weight - you'll lose discrimination
- Reserve high weights (25-30) for pathognomonic signs
- Use moderate weights (10-20) for typical presentations

### 3. **Include Negatives**
Consider adding keywords for ruling out conditions:
```csv
"cough,fever,NO murmur,young dog,recent boarding"
```

### 4. **Species-Specific Protocols**
Create separate templates or use species indicators:
```csv
Feline Asthma,"cough,dyspnea,wheezing,expiratory effort,cat,feline",12,22,...
Canine Heartworm,"cough,exercise intolerance,weight loss,dog,canine,endemic area",8,25,...
```

### 5. **Update Regularly**
Review and refine based on:
- Cases that were scored incorrectly
- New diagnostic criteria
- Recent literature
- Your clinical experience

### 6. **Test Your Template**
Run several known cases through the system to validate:
- Are the top differentials ranking appropriately?
- Are rare-but-serious conditions getting flagged?
- Do the scores make clinical sense?

---

## Common Mistakes to Avoid

❌ **Too many keywords** - Makes matching too easy, reduces specificity
✅ Keep to 4-8 most important signs per condition

❌ **All high base probabilities** - Everything looks equally likely
✅ Reflect actual prevalence in your population

❌ **Identical match weights** - Loses clinical nuance
✅ Weight more specific signs higher

❌ **Vague treatment plans** - "See protocol" isn't helpful
✅ Give specific starting doses and monitoring plans

❌ **Forgetting commas in quoted lists** - Parser errors
✅ Always enclose comma-separated keywords in quotes

---

## Template Validation Checklist

Before deploying your template:

- [ ] All 6 columns present for every row
- [ ] Disease names are clear and specific
- [ ] Keywords are in quotes and comma-separated
- [ ] Base probabilities total to a reasonable range (not all 50+)
- [ ] Match weights vary based on sign specificity
- [ ] Tests are clinically appropriate
- [ ] Treatment plans are actionable
- [ ] CSV format is valid (test by opening in Excel/Sheets)
- [ ] File is saved with `.csv` extension
- [ ] UTF-8 encoding (for special characters)

---

## Sample Complete Template

Download or create a file called `my_clinic_protocol.csv`:

```csv
Disease,Symptom_Keywords,Base_Probability,Match_Weight,Suggested_Tests,Treatment_Plan
Pneumonia,"cough,fever,dyspnea,lethargy,crackles",15,20,"Chest X-ray, CBC, Chemistry","Broad-spectrum antibiotics, Nebulization, Oxygen therapy"
Kennel Cough,"dry cough,hacking,boarding history",25,15,"PCR panel, Clinical exam","Cough suppressants, Isolation, Supportive care"
CHF,"murmur,cough,exercise intolerance,dyspnea,ascites",10,25,"Echocardiogram, ProBNP, Chest X-ray","Furosemide 2mg/kg BID, Pimobendan, ACE inhibitor"
Acute Gastroenteritis,"vomiting,diarrhea,anorexia,dehydration",30,12,"Fecal exam, Parvovirus test","IV fluids, Maropitant, NPO, Metronidazole"
Pancreatitis,"vomiting,abdominal pain,anorexia,lethargy",12,22,"Spec cPL, Ultrasound, CBC","NPO, IV fluids, Maropitant, Pain management"
Diabetes Mellitus,"PU/PD,polyphagia,weight loss",15,20,"Glucose, Fructosamine, Urinalysis","Insulin therapy, Diet management, Glucose monitoring"
Hyperthyroidism,"weight loss,polyphagia,hyperactivity,tachycardia",18,18,"Total T4, CBC, Chemistry","Methimazole, Monitor thyroid and renal"
Foreign Body,"vomiting,anorexia,abdominal pain",8,25,"Abdominal X-ray, Ultrasound","Surgery vs endoscopy, Supportive care"
```

---

## Usage in Mozarela.MD

1. **Save your template** as a `.csv` file
2. **Select "Weighted Analysis"** mode in the application
3. **Upload your CSV** file when prompted
4. **Enter patient data** (species, breed, age, clinical signs)
5. **Review results** - scores are calculated from your protocol
6. **AI adds context** about signalment-specific considerations

The system will:
- ✅ Match keywords from patient's clinical signs to your protocol
- ✅ Calculate scores based on your base probabilities and weights
- ✅ Rank differentials by score
- ✅ Display your suggested tests and treatment plans
- ✅ Add AI-generated clinical considerations based on breed, age, and species

---

## Support & Questions

If you need help:
- The default template can be downloaded from the app
- Start simple and expand over time
- Share templates within your clinic for standardization
- Update based on outcomes and feedback

**Remember**: This is a clinical decision support tool, not a replacement for veterinary judgment. Always consider the individual patient and clinical context.
