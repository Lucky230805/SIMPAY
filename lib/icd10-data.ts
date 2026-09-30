export interface ICD10Item {
  code: string
  nameIndo: string
  nameEng: string
  category: string
}

export const POPULAR_ICD10_CODES: ICD10Item[] = [
  // Respiratory (Infeksi Saluran Napas)
  { code: 'J00', nameIndo: 'ISPA / Batuk Pilek / Pilek Akut', nameEng: 'Acute nasopharyngitis [common cold]', category: 'Respirasi' },
  { code: 'J02.9', nameIndo: 'Faringitis Akut / Radang Tenggorokan', nameEng: 'Acute pharyngitis, unspecified', category: 'Respirasi' },
  { code: 'J03.9', nameIndo: 'Tonsilitis Akut / Amandel', nameEng: 'Acute tonsillitis, unspecified', category: 'Respirasi' },
  { code: 'J04.0', nameIndo: 'Laringitis Akut', nameEng: 'Acute laryngitis', category: 'Respirasi' },
  { code: 'J06.9', nameIndo: 'Infeksi Saluran Pernapasan Atas Akut (ISPA)', nameEng: 'Acute upper respiratory infection, unspecified', category: 'Respirasi' },
  { code: 'J18.9', nameIndo: 'Pneumonia / Radang Paru-paru', nameEng: 'Pneumonia, unspecified', category: 'Respirasi' },
  { code: 'J20.9', nameIndo: 'Bronkitis Akut', nameEng: 'Acute bronchitis, unspecified', category: 'Respirasi' },
  { code: 'J44.9', nameIndo: 'PPOK (Penyakit Paru Obstruktif Kronis)', nameEng: 'Chronic obstructive pulmonary disease, unspecified', category: 'Respirasi' },
  { code: 'J45.9', nameIndo: 'Asma Bronkial', nameEng: 'Asthma, unspecified', category: 'Respirasi' },
  { code: 'J30.4', nameIndo: 'Rinitis Alergi', nameEng: 'Allergic rhinitis, unspecified', category: 'Respirasi' },
  { code: 'J01.9', nameIndo: 'Sinusitis Akut', nameEng: 'Acute sinusitis, unspecified', category: 'Respirasi' },
  { code: 'R05', nameIndo: 'Batuk Gejala Umum', nameEng: 'Cough', category: 'Respirasi' },

  // Cardiovascular (Jantung & Pembuluh Darah)
  { code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', nameEng: 'Essential (primary) hypertension', category: 'Kardiovaskular' },
  { code: 'I11.9', nameIndo: 'Penyakit Jantung Hipertensi', nameEng: 'Hypertensive heart disease without heart failure', category: 'Kardiovaskular' },
  { code: 'I20.9', nameIndo: 'Angina Pektoris / Nyeri Dada Jantung', nameEng: 'Angina pectoris, unspecified', category: 'Kardiovaskular' },
  { code: 'I21.9', nameIndo: 'Infrak Miokard Akut (Serangan Jantung)', nameEng: 'Acute myocardial infarction, unspecified', category: 'Kardiovaskular' },
  { code: 'I50.9', nameIndo: 'Gagal Jantung', nameEng: 'Heart failure, unspecified', category: 'Kardiovaskular' },
  { code: 'I95.9', nameIndo: 'Hipotensi / Tekanan Darah Rendah', nameEng: 'Hypotension, unspecified', category: 'Kardiovaskular' },
  { code: 'I84.9', nameIndo: 'Hemoroid / Wasir', nameEng: 'Hemorrhoids, unspecified', category: 'Kardiovaskular' },

  // Digestive / Gastroenterology (Pencernaan)
  { code: 'A09', nameIndo: 'Gastroenteritis & Kolitis / Diare / Muntaber', nameEng: 'Infectious gastroenteritis and colitis, unspecified', category: 'Pencernaan' },
  { code: 'K29.7', nameIndo: 'Gastritis / Sakit Maag', nameEng: 'Gastritis, unspecified', category: 'Pencernaan' },
  { code: 'K21.9', nameIndo: 'GERD (Refluks Asam Lambung)', nameEng: 'Gastro-esophageal reflux disease without esophagitis', category: 'Pencernaan' },
  { code: 'K30', nameIndo: 'Dispepsia / Nyeri Ulu Hati', nameEng: 'Dyspepsia', category: 'Pencernaan' },
  { code: 'K35.8', nameIndo: 'Apendisitis Akut (Usus Buntu)', nameEng: 'Acute appendicitis, other and unspecified', category: 'Pencernaan' },
  { code: 'K59.0', nameIndo: 'Konstipasi / Sembelit', nameEng: 'Constipation', category: 'Pencernaan' },
  { code: 'K52.9', nameIndo: 'Gastroenteritis Non-infeksius', nameEng: 'Noninfective gastroenteritis and colitis, unspecified', category: 'Pencernaan' },
  { code: 'R11', nameIndo: 'Mual dan Muntah (Nausea & Vomiting)', nameEng: 'Nausea and vomiting', category: 'Pencernaan' },
  { code: 'R10.4', nameIndo: 'Nyeri Perut / Abdominal Pain', nameEng: 'Other and unspecified abdominal pain', category: 'Pencernaan' },

  // Metabolic & Endocrine (Metabolik & Hormonal)
  { code: 'E11.9', nameIndo: 'Diabetes Melitus Tipe 2 (Gula Darah)', nameEng: 'Type 2 diabetes mellitus without complications', category: 'Endokrin' },
  { code: 'E10.9', nameIndo: 'Diabetes Melitus Tipe 1', nameEng: 'Type 1 diabetes mellitus without complications', category: 'Endokrin' },
  { code: 'E78.5', nameIndo: 'Hiperlipidemia / Kolesterol Tinggi', nameEng: 'Hyperlipidemia, unspecified', category: 'Endokrin' },
  { code: 'E79.0', nameIndo: 'Hiperurisemia / Asam Urat Tinggi', nameEng: 'Hyperuricemia without signs of inflammatory arthritis', category: 'Endokrin' },
  { code: 'E66.9', nameIndo: 'Obesitas / Kegemukan', nameEng: 'Obesity, unspecified', category: 'Endokrin' },
  { code: 'E05.9', nameIndo: 'Tirotoksikosis / Hipertiroid', nameEng: 'Thyrotoxicosis, unspecified', category: 'Endokrin' },
  { code: 'E03.9', nameIndo: 'Hipotiroidisme', nameEng: 'Hypothyroidism, unspecified', category: 'Endokrin' },

  // Musculoskeletal & Neurology (Otot, Sendi & Saraf)
  { code: 'M79.1', nameIndo: 'Mialgia / Nyeri Otot & Pegal-pegal', nameEng: 'Myalgia', category: 'Otot & Saraf' },
  { code: 'M10.9', nameIndo: 'Gout Arthritis / Gout / Asam Urat Sendi', nameEng: 'Gout, unspecified', category: 'Otot & Saraf' },
  { code: 'M13.9', nameIndo: 'Artritis / Radang Sendi', nameEng: 'Arthritis, unspecified', category: 'Otot & Saraf' },
  { code: 'M54.5', nameIndo: 'Low Back Pain (LBP) / Nyeri Pinggang Bawah', nameEng: 'Low back pain', category: 'Otot & Saraf' },
  { code: 'M54.2', nameIndo: 'Servikalgia / Nyeri Leher', nameEng: 'Cervicalgia', category: 'Otot & Saraf' },
  { code: 'G44.2', nameIndo: 'Tension Headache / Sakit Kepala Tegang', nameEng: 'Tension-type headache', category: 'Otot & Saraf' },
  { code: 'G43.9', nameIndo: 'Migrain / Sakit Kepala Sebelah', nameEng: 'Migraine, unspecified', category: 'Otot & Saraf' },
  { code: 'R51', nameIndo: 'Sakit Kepala Umum (Cephalgia)', nameEng: 'Headache', category: 'Otot & Saraf' },
  { code: 'H81.1', nameIndo: 'Vertigo / Benign Paroxysmal Vertigo', nameEng: 'Benign paroxysmal vertigo', category: 'Otot & Saraf' },
  { code: 'G56.0', nameIndo: 'Carpal Tunnel Syndrome (CTS)', nameEng: 'Carpal tunnel syndrome', category: 'Otot & Saraf' },

  // Dermatology & Allergy (Kulit & Alergi)
  { code: 'L20.9', nameIndo: 'Dermatitis Atopik / Eksim', nameEng: 'Atopic dermatitis, unspecified', category: 'Kulit' },
  { code: 'L23.9', nameIndo: 'Dermatitis Kontak Alergi', nameEng: 'Allergic contact dermatitis, unspecified', category: 'Kulit' },
  { code: 'L50.9', nameIndo: 'Urtikaria / Biduran / Gatal Alergi', nameEng: 'Urticaria, unspecified', category: 'Kulit' },
  { code: 'L03.9', nameIndo: 'Selulitis / Infeksi Kulit Akut', nameEng: 'Cellulitis, unspecified', category: 'Kulit' },
  { code: 'L02.9', nameIndo: 'Abses Kulit / Bisul / Furunkel', nameEng: 'Cutaneous abscess, furuncle and carbuncle', category: 'Kulit' },
  { code: 'B35.4', nameIndo: 'Tinea Corporis / Kurap / Jamur Badan', nameEng: 'Tinea corporis', category: 'Kulit' },
  { code: 'B35.3', nameIndo: 'Tinea Pedis / Kutu Air / Jamur Kaki', nameEng: 'Tinea pedis', category: 'Kulit' },
  { code: 'L70.0', nameIndo: 'Akne Vulgaris / Jerawat', nameEng: 'Acne vulgaris', category: 'Kulit' },
  { code: 'B02.9', nameIndo: 'Herpes Zoster / Cacar Ular', nameEng: 'Herpes zoster without complication', category: 'Kulit' },
  { code: 'B01.9', nameIndo: 'Varisela / Cacar Air', nameEng: 'Varicella without complication', category: 'Kulit' },

  // Infections & Tropical Diseases (Infeksi & Tropis)
  { code: 'A91', nameIndo: 'Demam Berdarah Dengue (DBD / DHF)', nameEng: 'Dengue hemorrhagic fever', category: 'Infeksi' },
  { code: 'A90', nameIndo: 'Demam Dengue (DD)', nameEng: 'Dengue fever [classical dengue]', category: 'Infeksi' },
  { code: 'A01.0', nameIndo: 'Demam Tifoid / Tipus', nameEng: 'Typhoid fever', category: 'Infeksi' },
  { code: 'B54', nameIndo: 'Malaria', nameEng: 'Unspecified malaria', category: 'Infeksi' },
  { code: 'A15.0', nameIndo: 'Tuberkulosis Paru (TB Paru)', nameEng: 'Tuberculosis of lung', category: 'Infeksi' },
  { code: 'R50.9', nameIndo: 'Demam tanpa Spesifikasi (Fever)', nameEng: 'Fever, unspecified', category: 'Infeksi' },
  { code: 'B05.9', nameIndo: 'Campak / Measles', nameEng: 'Measles without complication', category: 'Infeksi' },

  // Nephrology & Urology (Ginjal & Saluran Kemih)
  { code: 'N39.0', nameIndo: 'Infeksi Saluran Kemih (ISK)', nameEng: 'Urinary tract infection, site unspecified', category: 'Urologi' },
  { code: 'N20.0', nameIndo: 'Nefrolitiasis / Batu Ginjal', nameEng: 'Calculus of kidney', category: 'Urologi' },
  { code: 'N20.1', nameIndo: 'Ureterolitiasis / Batu Ureter', nameEng: 'Calculus of ureter', category: 'Urologi' },
  { code: 'N40', nameIndo: 'BPH (Benign Prostatic Hyperplasia / Prostat)', nameEng: 'Hyperplasia of prostate', category: 'Urologi' },
  { code: 'N18.9', nameIndo: 'Penyakit Ginjal Kronis (PGK)', nameEng: 'Chronic kidney disease, unspecified', category: 'Urologi' },

  // Ophthalmology & ENT (Mata & THT)
  { code: 'H10.9', nameIndo: 'Konjungtivitis / Belek / Radang Mata', nameEng: 'Conjunctivitis, unspecified', category: 'Mata & THT' },
  { code: 'H60.9', nameIndo: 'Otitis Eksterna / Infeksi Telinga Luar', nameEng: 'Otitis externa, unspecified', category: 'Mata & THT' },
  { code: 'H65.9', nameIndo: 'Otitis Media / Infeksi Telinga Tengah', nameEng: 'Nonsuppurative otitis media, unspecified', category: 'Mata & THT' },
  { code: 'H61.2', nameIndo: 'Serumen Prop / Serumen Telinga Tersumbat', nameEng: 'Impacted cerumen', category: 'Mata & THT' },
  { code: 'R04.0', nameIndo: 'Epistaksis / Mimisan', nameEng: 'Epistaxis', category: 'Mata & THT' },

  // Obstetrics & Gynecology (Kebidanan & Kandungan)
  { code: 'N94.6', nameIndo: 'Dismenore / Nyeri Haid', nameEng: 'Dysmenorrhea, unspecified', category: 'Obstetri & Ginekologi' },
  { code: 'N89.8', nameIndo: 'Fluor Albus / Keputihan', nameEng: 'Other specified noninflammatory disorders of vagina', category: 'Obstetri & Ginekologi' },
  { code: 'O80.9', nameIndo: 'Persalinan Normal / Spontan', nameEng: 'Single spontaneous delivery, unspecified', category: 'Obstetri & Ginekologi' },
  { code: 'Z34.9', nameIndo: 'Pemeriksaan Kehamilan (ANC Normal)', nameEng: 'Encounter for supervision of normal pregnancy, unspecified', category: 'Obstetri & Ginekologi' },

  // Dental (Gigi & Mulut)
  { code: 'K02.9', nameIndo: 'Karies Gigi / Gigi Berlubang', nameEng: 'Dental caries, unspecified', category: 'Gigi & Mulut' },
  { code: 'K04.7', nameIndo: 'Abses Periapikal Gigi', nameEng: 'Periapical abscess without sinus', category: 'Gigi & Mulut' },
  { code: 'K05.3', nameIndo: 'Periodontitis / Radang Gusi', nameEng: 'Chronic periodontitis', category: 'Gigi & Mulut' },
  { code: 'K12.1', nameIndo: 'Stomatitis / Sariawan', nameEng: 'Other forms of stomatitis', category: 'Gigi & Mulut' },

  // General Symptoms & External Causes (Trauma & Luka)
  { code: 'S00.9', nameIndo: 'Luka Memar Kepala / Kontusio', nameEng: 'Superficial injury of head, unspecified', category: 'Trauma' },
  { code: 'S61.9', nameIndo: 'Luka Robek / Vulnus Laceratum Tangan', nameEng: 'Open wound of wrist and hand, unspecified', category: 'Trauma' },
  { code: 'T14.1', nameIndo: 'Luka Terbuka / Vulnus Laceratum', nameEng: 'Open wound of unspecified body region', category: 'Trauma' },
  { code: 'T14.0', nameIndo: 'Luka Lecet / Vulnus Excoriatum', nameEng: 'Superficial injury of unspecified body region', category: 'Trauma' },
  { code: 'T30.0', nameIndo: 'Luka Bakar / Combustio', nameEng: 'Burn of unspecified body region, unspecified degree', category: 'Trauma' },
]

/**
 * Search ICD-10 entries by code, indonesian name, english name, or category
 */
export function searchICD10(query: string, limit = 10): ICD10Item[] {
  if (!query || query.trim() === '') return POPULAR_ICD10_CODES.slice(0, limit)
  const q = query.toLowerCase().trim()

  return POPULAR_ICD10_CODES.filter((item) => {
    return (
      item.code.toLowerCase().includes(q) ||
      item.nameIndo.toLowerCase().includes(q) ||
      item.nameEng.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  }).slice(0, limit)
}
