/**
 * Clinical dictionaries — shared autocomplete/quick-pick sources used by
 * the encounter consultation form, IPD admission Rx/lab dialogs, and any
 * other clinical entry surface. Centralised so that:
 *   - the OPD and IPD forms feel identical (same suggestions, same labels)
 *   - we have a single place to broaden/curate the lists later or swap to
 *     an authoritative server-side catalog (pharmacy master, ICD-10) without
 *     tracking down inline constants in five components.
 *
 * These lists are intentionally short and pragmatic for an Indian
 * primary-care context — they're suggestions, not enforced enums (every
 * autocomplete is `freeSolo`, the doctor can always type a custom value).
 */

export interface CommonTest {
  name: string;
  type: string;
}

// ── Pharmacy ────────────────────────────────────────────────────────────────

export const COMMON_MEDICINES = [
  'Paracetamol 500mg', 'Paracetamol 650mg', 'Ibuprofen 400mg', 'Ibuprofen 600mg',
  'Amoxicillin 500mg', 'Amoxicillin 250mg', 'Azithromycin 500mg', 'Azithromycin 250mg',
  'Cetirizine 10mg', 'Levocetirizine 5mg', 'Montelukast 10mg',
  'Omeprazole 20mg', 'Pantoprazole 40mg', 'Rabeprazole 20mg',
  'Metformin 500mg', 'Metformin 1000mg', 'Glimepiride 1mg', 'Glimepiride 2mg',
  'Aspirin 75mg', 'Clopidogrel 75mg',
  'Atorvastatin 10mg', 'Atorvastatin 20mg', 'Rosuvastatin 10mg',
  'Amlodipine 5mg', 'Amlodipine 10mg', 'Telmisartan 40mg', 'Telmisartan 80mg',
  'Metoprolol 25mg', 'Metoprolol 50mg', 'Atenolol 50mg',
  'Doxycycline 100mg', 'Ciprofloxacin 500mg', 'Norfloxacin 400mg',
  'Prednisolone 10mg', 'Prednisolone 20mg', 'Methylprednisolone 4mg',
  'Vitamin D3 60000IU', 'Vitamin B12 500mcg', 'Calcium + Vitamin D',
  'Iron + Folic Acid', 'Multivitamin', 'Zinc 50mg',
  'ORS Sachet', 'Diclofenac 50mg', 'Ondansetron 4mg', 'Domperidone 10mg',
  'Ranitidine 150mg', 'Lansoprazole 30mg', 'Hyoscine Butylbromide 10mg',
  'Salbutamol Inhaler', 'Budesonide Inhaler',
];

// Compact short-form codes used by clinicians; long-form labels follow for UI.
export const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'PRN', 'HS', 'Stat', 'OD AM', 'OD PM'];

export const FREQUENCY_LABELS: Record<string, string> = {
  OD: 'OD — once daily',
  BD: 'BD — twice daily',
  TDS: 'TDS — three times daily',
  QID: 'QID — four times daily',
  SOS: 'SOS — if needed',
  PRN: 'PRN — as required',
  HS: 'HS — at bedtime',
  Stat: 'Stat — immediately, single dose',
  'OD AM': 'OD AM — once in morning',
  'OD PM': 'OD PM — once in evening',
};

export const DURATIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days',
  '1 month', '2 months', '3 months', 'Ongoing',
];

export const INSTRUCTIONS = [
  'After food', 'Before food', 'With food', 'Empty stomach',
  'At bedtime', 'With warm water', 'Sublingual', 'As needed',
];

export const DOSAGES = [
  '100mg', '250mg', '500mg', '1g', '5mg', '10mg', '20mg', '40mg', '80mg',
  '1 tablet', '2 tablets', '½ tablet', '5ml', '10ml', '15ml',
];

// ── Investigations ──────────────────────────────────────────────────────────

export const COMMON_TESTS: CommonTest[] = [
  { name: 'Complete Blood Count (CBC)',      type: 'HAEMATOLOGY' },
  { name: 'Blood Sugar Fasting',             type: 'BIOCHEMISTRY' },
  { name: 'Blood Sugar Random',              type: 'BIOCHEMISTRY' },
  { name: 'HbA1c',                           type: 'BIOCHEMISTRY' },
  { name: 'Lipid Profile',                   type: 'BIOCHEMISTRY' },
  { name: 'Liver Function Test (LFT)',       type: 'BIOCHEMISTRY' },
  { name: 'Kidney Function Test (KFT)',      type: 'BIOCHEMISTRY' },
  { name: 'Serum Creatinine',                type: 'BIOCHEMISTRY' },
  { name: 'Uric Acid',                       type: 'BIOCHEMISTRY' },
  { name: 'Thyroid Profile (T3/T4/TSH)',     type: 'BIOCHEMISTRY' },
  { name: 'Vitamin D',                       type: 'BIOCHEMISTRY' },
  { name: 'Vitamin B12',                     type: 'BIOCHEMISTRY' },
  { name: 'Urine Routine & Microscopy',      type: 'MICROBIOLOGY' },
  { name: 'Stool Routine',                   type: 'MICROBIOLOGY' },
  { name: 'Electrolytes (Na/K/Cl)',          type: 'BIOCHEMISTRY' },
  { name: 'ECG',                             type: 'CARDIOLOGY'  },
  { name: 'Chest X-Ray PA View',             type: 'RADIOLOGY'   },
  { name: 'Ultrasound Abdomen',              type: 'RADIOLOGY'   },
  { name: 'Blood Culture & Sensitivity',     type: 'MICROBIOLOGY' },
  { name: 'Urine Culture & Sensitivity',     type: 'MICROBIOLOGY' },
  { name: 'CT Brain (Plain)',                type: 'RADIOLOGY'   },
  { name: 'MRI Spine',                       type: 'RADIOLOGY'   },
  { name: '2D Echo',                         type: 'CARDIOLOGY'  },
  { name: 'CRP',                             type: 'BIOCHEMISTRY' },
  { name: 'D-Dimer',                         type: 'BIOCHEMISTRY' },
];

// Look up a CommonTest by exact (case-insensitive) name; the lab modules
// use this to pre-fill `testType` when the doctor types or picks a name
// that we know about, while keeping the field free-text for everything
// else.
export const findCommonTestType = (name: string): string | undefined => {
  if (!name) return undefined;
  const q = name.trim().toLowerCase();
  return COMMON_TESTS.find((t) => t.name.toLowerCase() === q)?.type;
};

// Single source of truth for the test-type select dropdowns. Old IPD code
// used `BLOOD/URINE/STOOL/...` and `LAB/RADIOLOGY/PATHOLOGY` — they are
// listed here for back-compat but the canonical set is the categorical
// list used by `COMMON_TESTS` (HAEMATOLOGY etc.).
export const TEST_TYPE_OPTIONS = [
  'HAEMATOLOGY',
  'BIOCHEMISTRY',
  'MICROBIOLOGY',
  'PATHOLOGY',
  'RADIOLOGY',
  'CARDIOLOGY',
  'OTHER',
];

export const TEST_PRIORITIES = ['ROUTINE', 'URGENT', 'STAT'];

// ── Clinical narrative — chief complaints, diagnoses, patient instructions ──

export const COMMON_COMPLAINTS = [
  'Fever',
  'Cough',
  'Cold / Runny nose',
  'Sore throat',
  'Headache',
  'Body ache / Generalised weakness',
  'Chest pain',
  'Shortness of breath',
  'Palpitations',
  'Abdominal pain',
  'Nausea / Vomiting',
  'Loose motions',
  'Constipation',
  'Burning micturition',
  'Lower back pain',
  'Joint pain',
  'Dizziness / Giddiness',
  'Skin rash / Itching',
  'High blood sugar',
  'Hypertension follow-up',
  'Routine check-up',
  'Antenatal visit',
  'Vaccination',
];

export const COMMON_DIAGNOSES = [
  'Acute viral fever',
  'Upper respiratory tract infection',
  'Acute pharyngitis',
  'Acute bronchitis',
  'Pneumonia (community acquired)',
  'Acute gastroenteritis',
  'Urinary tract infection',
  'Hypertension — controlled',
  'Hypertension — uncontrolled',
  'Type 2 Diabetes Mellitus — controlled',
  'Type 2 Diabetes Mellitus — uncontrolled',
  'Iron deficiency anaemia',
  'Vitamin D deficiency',
  'Hypothyroidism',
  'Migraine',
  'Tension type headache',
  'Acid peptic disease / GERD',
  'Functional dyspepsia',
  'Allergic rhinitis',
  'Asthma',
  'Chronic obstructive pulmonary disease',
  'Acute lumbago',
  'Sciatica',
  'Osteoarthritis (knee)',
  'Dengue fever',
  'Typhoid fever',
  'Malaria',
  'Skin: tinea / fungal infection',
  'Skin: contact dermatitis',
  'Acute conjunctivitis',
  'Otitis externa',
  'Routine antenatal care — uncomplicated',
  'Routine well-child visit',
];

export const COMMON_PATIENT_INSTRUCTIONS = [
  'Take adequate rest and stay hydrated.',
  'Drink at least 3 litres of water a day.',
  'Avoid spicy and oily food for 5 days.',
  'Soft, easily digestible diet recommended.',
  'Salt-restricted diet (low sodium).',
  'Diabetic diet — avoid sugar and refined carbohydrates.',
  'Light exercise (30 min walk) daily.',
  'Avoid strenuous activity for 7 days.',
  'Steam inhalation 2–3 times a day.',
  'Warm saline gargle 3 times a day.',
  'Monitor blood sugar before breakfast and 2 hr after dinner.',
  'Monitor blood pressure twice daily and maintain a chart.',
  'Apply ice pack for 15 minutes, 3 times a day.',
  'Keep the wound clean and dry. Daily dressing.',
  'Return immediately if breathlessness, chest pain, or persistent vomiting.',
  'Follow-up if no improvement in 3 days.',
];

// Suggested follow-up windows used as quick-pick chips.
export const FOLLOW_UP_DAYS = [3, 7, 14, 30];

/**
 * Short progress-note phrases used by the IPD Daily Round dialog.
 * These are intentionally generic ("Patient is clinically improving",
 * "Continue current treatment plan") so a doctor can stack a few of
 * them and add specifics inline.
 */
export const COMMON_PROGRESS_NOTES = [
  'Patient is clinically improving.',
  'Patient is clinically stable.',
  'Patient is afebrile, vitals stable.',
  'Continue current treatment plan.',
  'Tolerating oral diet well.',
  'Bowel and bladder normal.',
  'No fresh complaints today.',
  'Mild residual symptoms — to monitor.',
  'Pain controlled on current analgesia.',
  'Wound clean and healthy, no signs of infection.',
  'Plan to step down to oral antibiotics.',
  'Plan for discharge tomorrow if vitals remain stable.',
  'Reviewed by consultant — plan continued.',
  'Awaiting investigation reports.',
  'Counselling done with attendant.',
];

// ── Chip-string serialization ───────────────────────────────────────────────
// Multi-Autocomplete fields (chief complaint, diagnoses, patient
// instructions, etc.) are persisted as a single string in the DB to keep
// the existing schema unchanged. We use `; ` as the separator because
// commas show up regularly inside diagnosis labels (e.g. "Type 2 DM,
// uncontrolled"). Both helpers are forgiving of legacy values: an old
// free-text string with no semicolons just becomes a single chip.

export const splitChips = (s: string | null | undefined): string[] => {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split(/\s*;\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
};

export const joinChips = (xs: string[] | null | undefined): string =>
  (xs || []).map((x) => x.trim()).filter(Boolean).join('; ');
