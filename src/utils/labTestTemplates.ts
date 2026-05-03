/**
 * Pre-defined lab test templates with standard reference ranges.
 * All values follow ICMR / Indian lab reference standards.
 * All fields can be overridden by the lab technician.
 */
import { LabParameter } from './labReportGenerator';

export interface LabTestTemplate {
  id: string;
  name: string;
  testType: string;
  sampleType: string;
  parameters: Omit<LabParameter, 'value' | 'flag'>[];
}

export const LAB_TEMPLATES: LabTestTemplate[] = [
  // ─── HAEMATOLOGY ──────────────────────────────────────────────────────────
  {
    id: 'cbc',
    name: 'CBC — Complete Blood Count',
    testType: 'HAEMATOLOGY',
    sampleType: 'Blood - EDTA',
    parameters: [
      { subGroup: 'Complete Blood Count', name: 'Haemoglobin (Hb)',        unit: 'g/dL',      referenceRange: '12.0 – 17.0' },
      { subGroup: 'Complete Blood Count', name: 'Total RBC Count',         unit: '10⁶/µL',    referenceRange: '4.5 – 5.5' },
      { subGroup: 'Complete Blood Count', name: 'Haematocrit (PCV)',        unit: '%',          referenceRange: '36 – 50' },
      { subGroup: 'Complete Blood Count', name: 'MCV',                     unit: 'fL',         referenceRange: '80 – 100' },
      { subGroup: 'Complete Blood Count', name: 'MCH',                     unit: 'pg',         referenceRange: '27 – 33' },
      { subGroup: 'Complete Blood Count', name: 'MCHC',                    unit: 'g/dL',       referenceRange: '32 – 36' },
      { subGroup: 'Complete Blood Count', name: 'RDW-CV',                  unit: '%',          referenceRange: '11.5 – 14.5' },
      { subGroup: 'WBC Differential',     name: 'Total WBC Count',         unit: '10³/µL',     referenceRange: '4.5 – 11.0' },
      { subGroup: 'WBC Differential',     name: 'Neutrophils',             unit: '%',          referenceRange: '50 – 70' },
      { subGroup: 'WBC Differential',     name: 'Lymphocytes',             unit: '%',          referenceRange: '20 – 40' },
      { subGroup: 'WBC Differential',     name: 'Monocytes',               unit: '%',          referenceRange: '2 – 8' },
      { subGroup: 'WBC Differential',     name: 'Eosinophils',             unit: '%',          referenceRange: '1 – 4' },
      { subGroup: 'WBC Differential',     name: 'Basophils',               unit: '%',          referenceRange: '0 – 1' },
      { subGroup: 'Platelet',             name: 'Platelet Count',          unit: '10³/µL',     referenceRange: '150 – 400' },
      { subGroup: 'Platelet',             name: 'MPV',                     unit: 'fL',         referenceRange: '7.5 – 12.5' },
    ],
  },

  // ─── LIVER FUNCTION ───────────────────────────────────────────────────────
  {
    id: 'lft',
    name: 'LFT — Liver Function Test',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Bilirubin',        name: 'Total Bilirubin',             unit: 'mg/dL',      referenceRange: '0.2 – 1.2' },
      { subGroup: 'Bilirubin',        name: 'Direct Bilirubin',            unit: 'mg/dL',      referenceRange: '0.0 – 0.3' },
      { subGroup: 'Bilirubin',        name: 'Indirect Bilirubin',          unit: 'mg/dL',      referenceRange: '0.1 – 1.0' },
      { subGroup: 'Enzymes',          name: 'SGOT / AST',                  unit: 'U/L',        referenceRange: '10 – 40' },
      { subGroup: 'Enzymes',          name: 'SGPT / ALT',                  unit: 'U/L',        referenceRange: '7 – 56' },
      { subGroup: 'Enzymes',          name: 'Alkaline Phosphatase (ALP)',   unit: 'U/L',        referenceRange: '44 – 147' },
      { subGroup: 'Enzymes',          name: 'GGT',                         unit: 'U/L',        referenceRange: '9 – 48' },
      { subGroup: 'Protein',          name: 'Total Protein',               unit: 'g/dL',       referenceRange: '6.0 – 8.3' },
      { subGroup: 'Protein',          name: 'Albumin',                     unit: 'g/dL',       referenceRange: '3.5 – 5.0' },
      { subGroup: 'Protein',          name: 'Globulin',                    unit: 'g/dL',       referenceRange: '2.0 – 3.5' },
      { subGroup: 'Protein',          name: 'A/G Ratio',                   unit: '',           referenceRange: '1.0 – 2.5' },
    ],
  },

  // ─── KIDNEY FUNCTION ──────────────────────────────────────────────────────
  {
    id: 'kft',
    name: 'KFT — Kidney Function Test',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Renal',            name: 'Blood Urea Nitrogen (BUN)',   unit: 'mg/dL',      referenceRange: '7 – 20' },
      { subGroup: 'Renal',            name: 'Blood Urea',                  unit: 'mg/dL',      referenceRange: '15 – 40' },
      { subGroup: 'Renal',            name: 'Serum Creatinine',            unit: 'mg/dL',      referenceRange: '0.6 – 1.2' },
      { subGroup: 'Renal',            name: 'eGFR',                        unit: 'mL/min/1.73m²', referenceRange: '> 60' },
      { subGroup: 'Renal',            name: 'Uric Acid',                   unit: 'mg/dL',      referenceRange: '3.5 – 7.2' },
      { subGroup: 'Electrolytes',     name: 'Sodium (Na⁺)',                unit: 'mEq/L',      referenceRange: '136 – 145' },
      { subGroup: 'Electrolytes',     name: 'Potassium (K⁺)',              unit: 'mEq/L',      referenceRange: '3.5 – 5.1' },
      { subGroup: 'Electrolytes',     name: 'Chloride (Cl⁻)',              unit: 'mEq/L',      referenceRange: '98 – 107' },
      { subGroup: 'Electrolytes',     name: 'Bicarbonate (HCO₃)',          unit: 'mEq/L',      referenceRange: '22 – 29' },
    ],
  },

  // ─── THYROID ──────────────────────────────────────────────────────────────
  {
    id: 'tft',
    name: 'TFT — Thyroid Function Test',
    testType: 'IMMUNOLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Thyroid Profile', name: 'TSH (Thyroid Stimulating Hormone)', unit: 'mIU/L',  referenceRange: '0.4 – 4.0' },
      { subGroup: 'Thyroid Profile', name: 'T3 (Triiodothyronine)',             unit: 'ng/dL',   referenceRange: '80 – 200' },
      { subGroup: 'Thyroid Profile', name: 'T4 (Thyroxine)',                    unit: 'µg/dL',   referenceRange: '5.1 – 14.1' },
      { subGroup: 'Thyroid Profile', name: 'Free T3 (fT3)',                     unit: 'pg/mL',   referenceRange: '2.3 – 4.2' },
      { subGroup: 'Thyroid Profile', name: 'Free T4 (fT4)',                     unit: 'ng/dL',   referenceRange: '0.8 – 1.8' },
    ],
  },

  // ─── LIPID PROFILE ────────────────────────────────────────────────────────
  {
    id: 'lipid',
    name: 'Lipid Profile',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum (Fasting 12 hrs)',
    parameters: [
      { subGroup: 'Lipid Profile',   name: 'Total Cholesterol',            unit: 'mg/dL',      referenceRange: '< 200' },
      { subGroup: 'Lipid Profile',   name: 'HDL Cholesterol',              unit: 'mg/dL',      referenceRange: '> 40 (M) / > 50 (F)' },
      { subGroup: 'Lipid Profile',   name: 'LDL Cholesterol',              unit: 'mg/dL',      referenceRange: '< 100' },
      { subGroup: 'Lipid Profile',   name: 'VLDL Cholesterol',             unit: 'mg/dL',      referenceRange: '5 – 40' },
      { subGroup: 'Lipid Profile',   name: 'Triglycerides',                unit: 'mg/dL',      referenceRange: '< 150' },
      { subGroup: 'Lipid Profile',   name: 'Total Cholesterol / HDL Ratio',unit: '',           referenceRange: '< 5.0' },
      { subGroup: 'Lipid Profile',   name: 'LDL / HDL Ratio',             unit: '',           referenceRange: '< 3.5' },
    ],
  },

  // ─── BLOOD SUGAR ──────────────────────────────────────────────────────────
  {
    id: 'bsl',
    name: 'Blood Sugar / Glucose',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum / Plasma',
    parameters: [
      { subGroup: 'Blood Glucose',   name: 'Fasting Blood Glucose',        unit: 'mg/dL',      referenceRange: '70 – 100' },
      { subGroup: 'Blood Glucose',   name: 'Post Prandial (2 hr PP)',      unit: 'mg/dL',      referenceRange: '< 140' },
      { subGroup: 'Blood Glucose',   name: 'Random Blood Glucose',         unit: 'mg/dL',      referenceRange: '< 140' },
      { subGroup: 'Blood Glucose',   name: 'HbA1c',                        unit: '%',          referenceRange: '4.0 – 5.6' },
    ],
  },

  // ─── URINE ROUTINE ────────────────────────────────────────────────────────
  {
    id: 'urine',
    name: 'Urine Routine & Microscopy',
    testType: 'MICROBIOLOGY',
    sampleType: 'Urine (Mid-stream)',
    parameters: [
      { subGroup: 'Physical Examination', name: 'Colour',                  unit: '',           referenceRange: 'Pale Yellow' },
      { subGroup: 'Physical Examination', name: 'Appearance',              unit: '',           referenceRange: 'Clear' },
      { subGroup: 'Physical Examination', name: 'pH',                      unit: '',           referenceRange: '4.5 – 8.0' },
      { subGroup: 'Physical Examination', name: 'Specific Gravity',        unit: '',           referenceRange: '1.005 – 1.030' },
      { subGroup: 'Chemical Examination', name: 'Protein',                 unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Glucose',                 unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Ketones',                 unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Blood',                   unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Bilirubin',               unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Urobilinogen',            unit: 'EU/dL',      referenceRange: '0.2 – 1.0' },
      { subGroup: 'Chemical Examination', name: 'Nitrite',                 unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Chemical Examination', name: 'Leucocyte Esterase',      unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Microscopic Examination', name: 'Pus Cells',            unit: '/HPF',       referenceRange: '0 – 5' },
      { subGroup: 'Microscopic Examination', name: 'RBCs',                 unit: '/HPF',       referenceRange: '0 – 2' },
      { subGroup: 'Microscopic Examination', name: 'Epithelial Cells',     unit: '/HPF',       referenceRange: '0 – 5' },
      { subGroup: 'Microscopic Examination', name: 'Casts',                unit: '',           referenceRange: 'None seen' },
      { subGroup: 'Microscopic Examination', name: 'Crystals',             unit: '',           referenceRange: 'None seen' },
      { subGroup: 'Microscopic Examination', name: 'Bacteria',             unit: '',           referenceRange: 'Nil' },
    ],
  },

  // ─── DENGUE ───────────────────────────────────────────────────────────────
  {
    id: 'dengue',
    name: 'Dengue Serology (NS1 + IgM/IgG)',
    testType: 'SEROLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Dengue Antigen/Antibody', name: 'NS1 Antigen',          unit: '',           referenceRange: 'Non-reactive' },
      { subGroup: 'Dengue Antigen/Antibody', name: 'Dengue IgM Antibody',  unit: '',           referenceRange: 'Non-reactive' },
      { subGroup: 'Dengue Antigen/Antibody', name: 'Dengue IgG Antibody',  unit: '',           referenceRange: 'Non-reactive' },
    ],
  },

  // ─── MALARIA ──────────────────────────────────────────────────────────────
  {
    id: 'malaria',
    name: 'Malaria Antigen Test',
    testType: 'PARASITOLOGY',
    sampleType: 'Blood - EDTA',
    parameters: [
      { subGroup: 'Malaria Antigen', name: 'P. falciparum (HRP-II)',        unit: '',           referenceRange: 'Negative' },
      { subGroup: 'Malaria Antigen', name: 'P. vivax (pLDH)',               unit: '',           referenceRange: 'Negative' },
    ],
  },

  // ─── ELECTROLYTES ─────────────────────────────────────────────────────────
  {
    id: 'electrolytes',
    name: 'Serum Electrolytes',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Electrolytes',    name: 'Sodium (Na⁺)',                  unit: 'mEq/L',      referenceRange: '136 – 145' },
      { subGroup: 'Electrolytes',    name: 'Potassium (K⁺)',                unit: 'mEq/L',      referenceRange: '3.5 – 5.1' },
      { subGroup: 'Electrolytes',    name: 'Chloride (Cl⁻)',                unit: 'mEq/L',      referenceRange: '98 – 107' },
      { subGroup: 'Electrolytes',    name: 'Bicarbonate (HCO₃)',            unit: 'mEq/L',      referenceRange: '22 – 29' },
      { subGroup: 'Electrolytes',    name: 'Magnesium (Mg²⁺)',              unit: 'mg/dL',      referenceRange: '1.7 – 2.2' },
      { subGroup: 'Electrolytes',    name: 'Phosphorus',                    unit: 'mg/dL',      referenceRange: '2.5 – 4.5' },
    ],
  },

  // ─── IRON STUDIES ─────────────────────────────────────────────────────────
  {
    id: 'iron',
    name: 'Iron Studies',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Iron Studies',    name: 'Serum Iron',                    unit: 'µg/dL',      referenceRange: '60 – 170' },
      { subGroup: 'Iron Studies',    name: 'TIBC',                          unit: 'µg/dL',      referenceRange: '250 – 370' },
      { subGroup: 'Iron Studies',    name: 'Transferrin Saturation',        unit: '%',          referenceRange: '20 – 50' },
      { subGroup: 'Iron Studies',    name: 'Serum Ferritin',                unit: 'ng/mL',      referenceRange: '12 – 300' },
    ],
  },

  // ─── COVID ANTIGEN ────────────────────────────────────────────────────────
  {
    id: 'covid_antigen',
    name: 'COVID-19 Antigen Test',
    testType: 'MICROBIOLOGY',
    sampleType: 'Nasopharyngeal Swab',
    parameters: [
      { subGroup: 'COVID-19', name: 'SARS-CoV-2 Antigen (Rapid)',          unit: '',           referenceRange: 'Negative' },
    ],
  },

  // ─── HIV SCREENING ────────────────────────────────────────────────────────
  {
    id: 'hiv',
    name: 'HIV Screening',
    testType: 'SEROLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'HIV Screening',   name: 'HIV 1 & 2 Antibody (ELISA)',   unit: '',           referenceRange: 'Non-reactive' },
    ],
  },

  // ─── HBsAg ────────────────────────────────────────────────────────────────
  {
    id: 'hbsag',
    name: 'HBsAg (Hepatitis B Surface Antigen)',
    testType: 'SEROLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Hepatitis B',     name: 'HBsAg (Rapid / ELISA)',        unit: '',           referenceRange: 'Non-reactive' },
    ],
  },

  // ─── HCV ──────────────────────────────────────────────────────────────────
  {
    id: 'hcv',
    name: 'HCV Antibody (Hepatitis C)',
    testType: 'SEROLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Hepatitis C',     name: 'Anti-HCV Antibody',            unit: '',           referenceRange: 'Non-reactive' },
    ],
  },

  // ─── WIDAL ────────────────────────────────────────────────────────────────
  {
    id: 'widal',
    name: 'Widal Test (Typhoid)',
    testType: 'SEROLOGY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Widal',           name: 'Salmonella Typhi O',           unit: 'titre',      referenceRange: '< 1:80' },
      { subGroup: 'Widal',           name: 'Salmonella Typhi H',           unit: 'titre',      referenceRange: '< 1:80' },
      { subGroup: 'Widal',           name: 'S. Paratyphi A-O',             unit: 'titre',      referenceRange: '< 1:80' },
      { subGroup: 'Widal',           name: 'S. Paratyphi A-H',             unit: 'titre',      referenceRange: '< 1:80' },
      { subGroup: 'Widal',           name: 'S. Paratyphi B-O',             unit: 'titre',      referenceRange: '< 1:80' },
      { subGroup: 'Widal',           name: 'S. Paratyphi B-H',             unit: 'titre',      referenceRange: '< 1:80' },
    ],
  },

  // ─── CRP ──────────────────────────────────────────────────────────────────
  {
    id: 'crp',
    name: 'CRP — C-Reactive Protein',
    testType: 'BIOCHEMISTRY',
    sampleType: 'Serum',
    parameters: [
      { subGroup: 'Inflammatory Markers', name: 'C-Reactive Protein (CRP)', unit: 'mg/L',    referenceRange: '< 5.0' },
      { subGroup: 'Inflammatory Markers', name: 'ESR (Westergren)',          unit: 'mm/hr',   referenceRange: '0 – 20 (M) / 0 – 30 (F)' },
    ],
  },
];

/** Find the closest matching template by test name (case-insensitive) */
export function matchTemplate(testName: string): LabTestTemplate | undefined {
  const q = testName.toLowerCase();
  return LAB_TEMPLATES.find(t =>
    q.includes(t.id) ||
    t.name.toLowerCase().includes(q) ||
    t.id.split('_').some(w => q.includes(w))
  );
}
