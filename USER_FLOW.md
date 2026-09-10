# SIMPAY — User Flow

## 1. Document Overview

### 1.1 Purpose
This document provides the complete, thesis-ready **User Flow Specification** for **SIMPAY** (*Sistem Informasi Manajemen Pelayanan, Antrean, dan Layanan Medis*). It details the step-by-step user journeys, role interactions, decision points, state transitions, and UI/backend validation behaviors across the entire outpatient healthcare lifecycle.

### 1.2 Scope
This specification covers all user-facing interactions within SIMPAY, including patient intake, polyclinic queue management, doctor examination, electronic prescription generation, FEFO pharmacy dispensing, cashier payment processing, medical history drawer views, reporting analytics, and unauthenticated public queue displays.

### 1.3 Prototype Context
The workflows documented herein accurately reflect the **current codebase implementation** of the SIMPAY prototype. It serves as an authoritative guide for user interface evaluation, academic thesis presentation, product auditing, and operational training.

---

## 2. User Roles

SIMPAY models exactly **TWO** application roles to reflect real-world clinic operations without administrative bloat:

```mermaid
graph LR
    subgraph "DOKTER (Clinical Role)"
        D1[Doctor Examination Workbench]
        D2[Record SOAP, Vitals & ICD-10]
        D3[Create Prescriptions]
        D4[View Patient Medical History]
    end

    subgraph "PERAWAT (Operational Role)"
        P1[Register Patients & Queues]
        P2[Manage Polyclinic Intake]
        P3[FEFO Pharmacy Dispensing]
        P4[Manage Medicine Catalog & Batches]
        P5[Cashier Payment Processing]
        P6[View Executive Reports]
    end
```

### 2.1 DOKTER
Medical Doctors focus exclusively on clinical diagnosis and patient treatment:
- **Examination Workbench**: Access waiting patient queues (`/antrean`) and open the clinical examination workbench (`/antrean/[id]`).
- **Clinical Data Recording**: Record subjective complaints, objective vitals (blood pressure, pulse, temperature, respiratory rate, weight, height, SpO2), past medical history, primary diagnosis, secondary diagnosis, and ICD-10 diagnostic codes.
- **Electronic Prescribing**: Add prescribed medicines, dosages, and instructions linked directly to the visit medical record.
- **Patient History**: Access historical SOAP notes and past clinical visits to inform diagnosis.

*Role Restrictions*: `DOKTER` cannot register new patients, mutate medicine inventory master/batches, process pharmacy dispensing, or process cashier payments.

### 2.2 PERAWAT
Nurses / Clinic Staff handle operational, pharmacy, cashier, and administrative responsibilities:
- **Patient Registration & Intake**: Register new patients (`/pasien`), generate sequential daily polyclinic queues, or search/queue existing patients.
- **Pharmacy Dispensing**: Review prescription queues (`/resep`), verify stock, and execute First-Expired, First-Out (FEFO) medicine dispensing.
- **Medicine Inventory Management**: Manage master medicine catalog (`/obat`), create stock batches, monitor expiry dates, and manage inventory adjustments.
- **Cashier Payment Processing**: View itemized billing (`/pembayaran`), process payments via `TUNAI`, `QRIS`, or `TRANSFER`, calculate cash change, and print receipts.
- **Reports & Analytics**: View operational statistics, revenue breakdowns, top ICD-10 diagnosis charts, and patient demographics (`/laporan`).

*Role Restrictions*: `PERAWAT` cannot access doctor-only clinical examination workbenches (`/antrean/[id]`).

---

## 3. Overall Patient Service Flow

The end-to-end service journey connects patient intake, clinical care, pharmacy, cashier, and historical record-keeping:

```mermaid
flowchart TD
    Start([Patient Arrives at Clinic]) --> RegPass{Existing Patient?}
    
    RegPass -- No --> RegNew[1. Register New Patient - PERAWAT]
    RegNew --> AutoQueue[Auto-Create Daily Queue - Status: MENUNGGU]
    
    RegPass -- Yes --> SearchRM[Search Patient by Name/Phone/RM - PERAWAT]
    SearchRM --> CreateQueue[Create Visit Queue - Status: MENUNGGU]

    AutoQueue --> TVDisplay[Public TV Callboard Displayed]
    CreateQueue --> TVDisplay

    TVDisplay --> DocIntake[2. Doctor Starts Exam - DOKTER]
    DocIntake --> ExamState[Queue Status: DALAM_PEMERIKSAAN]
    
    ExamState --> SaveExam[3. Save SOAP, Vitals, ICD-10 & Prescriptions - DOKTER]
    SaveExam --> StateWait[Queue Status: MENUNGGU_OBAT_DAN_BAYAR]
    SaveExam --> BillCreate[Generate Itemized Billing - Base Rp 50.000 + Medicines]

    StateWait --> PrescCheck{Prescriptions Prescribed?}
    
    PrescCheck -- Yes --> PharmQueue[4. Pharmacy Queue Intake - PERAWAT]
    PharmQueue --> FEFO[FEFO Stock Deduction & Prescription: SELESAI]
    FEFO --> Payment
    
    PrescCheck -- No --> Payment

    Payment[5. Cashier Payment Processing - PERAWAT] --> PayMethod{Payment Method}
    PayMethod -- TUNAI --> Cash[Calculate Change & Invoice: INV-YYYYMMDD-XXXX]
    PayMethod -- QRIS / TRANSFER --> Digital[Exact Payment & Invoice: INV-YYYYMMDD-XXXX]
    
    Cash --> SetPaid[Billing Status: LUNAS]
    Digital --> SetPaid
    
    SetPaid --> CompletionCheck{Billing LUNAS & Prescriptions SELESAI?}
    CompletionCheck -- Yes --> Complete[6. Queue Status: SELESAI]
    Complete --> Report[7. History Timeline & Reports Updated]
    Complete --> End([Patient Visit Completed])
```

---

## 4. Patient Registration Flow

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as Perawat
    participant UI as /pasien Form
    participant Action as createPatient()
    participant DB as SQLite DB

    Nurse->>UI: Open "Tambah Pasien Baru" Modal
    Nurse->>UI: Input Name, Gender, DOB, Phone, Address, Polyclinic
    Nurse->>UI: Click "Simpan Pasien & Buat Antrean"
    UI->>Action: Invoke createPatient(input)
    
    Action->>Action: Validate Inputs (Name >= 2 chars, valid DOB, Phone 7-13 digits)
    alt Validation Failed
        Action-->>UI: Return { success: false, errors }
        UI-->>Nurse: Highlight Invalid Fields
    else Validation Passed
        Action->>DB: $transaction: Create Patient & Daily Queue (Status: MENUNGGU)
        DB-->>Action: Transaction Committed
        Action-->>UI: Return { success: true, patient }
        UI-->>Nurse: Show Success Dialog & Assign Queue Number (e.g. #1)
    end
```

### 4.1 New Patient Entry Validation
- **Full Name**: Required, minimum 2 characters.
- **Gender**: Must be `"Laki-laki"` or `"Perempuan"`.
- **Date of Birth**: Required, valid date format, cannot be set in the future.
- **Phone Number**: Optional; if provided, must consist of 7–13 numeric digits (`/^[0-9]{7,13}$/`).
- **Polyclinic**: Defaults to `"Poli Umum"`.

### 4.2 Automated Queue Generation
When a new patient is registered, `createPatient()` automatically counts today's queues for the date boundary (`00:00:00` to `23:59:59`), assigns `queueNumber = count + 1`, and creates a `Queue` row with `status = 'MENUNGGU'`.

### 4.3 Existing Patient Search & Queue Creation
- **Search**: `getPatients()` supports keyword searching across name, phone, address, or Medical Record Number (e.g., `RM-00001` via helper `parseNoRM()`).
- **Queueing Returning Patient**: `createQueueItem()` creates a new `Queue` entry linked to the existing `patientId` for today's date, preserving previous medical history.

---

## 5. Queue Management Flow

### 5.1 Queue Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> MENUNGGU: Patient Intake / Registered (Status: MENUNGGU)
    MENUNGGU --> DALAM_PEMERIKSAAN: Doctor clicks "Mulai Pemeriksaan" (startExamination)
    DALAM_PEMERIKSAAN --> MENUNGGU_OBAT_DAN_BAYAR: Doctor saves exam & prescriptions (saveMedicalRecordAndComplete)
    MENUNGGU_OBAT_DAN_BAYAR --> SELESAI: Billing LUNAS & Prescriptions SELESAI (checkAndUpdateQueueCompletion)
    SELESAI --> [*]
```

### 5.2 Polyclinic Filtering & Display
- Staff can filter today's queues on `/antrean` by polyclinic (`Poli Umum`, `Poli Gigi`, `Poli KIA`, etc.).
- Summary stat cards display total queues, `MENUNGGU`, `DALAM_PEMERIKSAAN`, and `SELESAI` counts in real time.

---

## 6. Doctor Examination Flow

```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Dokter
    participant UI as /antrean/[id] Workbench
    participant Action as saveMedicalRecordAndComplete()
    participant DB as SQLite DB

    Doctor->>UI: Select Waiting Patient from Queue List
    Doctor->>UI: Click "Mulai Pemeriksaan" (Queue: DALAM_PEMERIKSAAN)
    Doctor->>UI: Record Complaint, Vitals (TD, Nadi, Temp, RR, BB, TB, SpO2)
    Doctor->>UI: Record Diagnosis, ICD-10 Code, Treatment Notes
    Doctor->>UI: Add Prescribed Medicines (Name, Dosage, Quantity)
    Doctor->>UI: Click "Simpan Rekam Medis & Selesaikan Pemeriksaan"
    
    UI->>Action: Invoke saveMedicalRecordAndComplete(data)
    Action->>Action: Check session role (requireRole('DOKTER'))
    Action->>DB: $transaction:
    Note over Action,DB: 1. Create/Update MedicalRecord<br/>2. Create Prescriptions with unitPrice snapshot<br/>3. Create/Update Billing (Base Rp 50.000 + Medicines)<br/>4. Update Queue status -> MENUNGGU_OBAT_DAN_BAYAR
    DB-->>Action: Transaction Committed
    Action-->>UI: Return { success: true }
    UI-->>Doctor: Redirect to /antrean with Success Toast
```

### 6.1 Clinical Fields Recorded
- **Subjective (S)**: Chief complaint & past medical history.
- **Objective (O)**: Vital signs (Blood Pressure `mmHg`, Pulse `x/m`, Temperature `°C`, Respiratory Rate `x/m`, Weight `kg`, Height `cm`, SpO2 `%`), physical exam notes, allergy warnings.
- **Assessment (A)**: Primary diagnosis, secondary diagnosis, and official ICD-10 diagnostic code (e.g. `J06.9`).
- **Plan (P)**: Action treatment, education notes, and electronic prescription items.

---

## 7. Prescription & Pharmacy Flow

```mermaid
flowchart TD
    Doc[Doctor Prescribes Medicines] --> Snap[Snapshot Unit Price & Total Price in Prescription]
    Snap --> Nurse[Nurse Opens /resep]
    Nurse --> Review[Review Prescription Queue - Status: ANTRE]
    Review --> Process[Click 'Serahkan Obat / Selesai']
    
    Process --> Query[Query Active Batches: expiryDate >= NOW & stockQuantity > 0 ORDER BY expiryDate ASC]
    Query --> CheckStock{Total Non-Expired Stock >= Required Qty?}
    
    CheckStock -- No --> Reject[Abort Transaction: 'Stok obat tidak mencukupi' - Zero Stock Deducted]
    
    CheckStock -- Yes --> FEFO[Deduct Stock from Earliest Expiring Batches]
    FEFO --> SetDone[Update Prescription Status -> SELESAI]
    SetDone --> AutoComp[Invoke checkAndUpdateQueueCompletion]
    AutoComp --> Finish[Pharmacy Dispensing Complete]
```

### 7.1 Pharmacy Principles
- **Unit Price Snapshotting**: When prescribed by a doctor, `unitPrice` and `totalPrice` are stored directly in `Prescription`. Future medicine catalog price updates do NOT modify pending bills.
- **FEFO Batch Selection**: Active non-expired batches (`expiryDate >= now`) with positive stock are ordered by `expiryDate asc`. Stock is consumed from the earliest expiring batch first.
- **Atomic Insufficient-Stock Rejection**: If aggregate non-expired stock is less than required quantity, an exception is raised, triggering a complete transaction rollback. No partial deductions occur.

---

## 8. Billing & Payment Flow

```mermaid
flowchart TD
    Init[Doctor Saves Exam] --> BaseFee[Base Fees: Registration Rp 15.000 + Consultation Rp 35.000 = Rp 50.000]
    BaseFee --> MedFee[Add Prescribed Medicine Fee Snapshot]
    MedFee --> Total[Calculate Total Amount & Billing Status: BELUM_LUNAS]
    
    Total --> Nurse[Nurse Opens /pembayaran]
    Nurse --> Select[Select Queue Visit & Payment Method]
    
    Select --> Method{Payment Method}
    
    Method -- TUNAI --> CashCheck{Amount Paid >= Total Amount?}
    CashCheck -- No --> CashErr[Reject: 'Uang dibayarkan kurang']
    CashCheck -- Yes --> CalcChange[Calculate Change = Amount Paid - Total Amount]
    CalcChange --> PayRec
    
    Method -- QRIS / TRANSFER --> DigitalCheck{Amount Paid >= Total Amount?}
    DigitalCheck -- No --> DigErr[Reject: 'Pembayaran via method tidak mencukupi']
    DigitalCheck -- Yes --> SetZeroChange[Set Change = Rp 0]
    SetZeroChange --> PayRec
    
    PayRec[Atomic $transaction: Create Payment INV-YYYYMMDD-XXXX & Update Billing: LUNAS] --> CheckCompl{Prescriptions Exist?}
    
    CheckCompl -- Yes --> CheckDisp{All Prescriptions SELESAI?}
    CheckDisp -- Yes --> MarkSELESAI[Update Queue Status -> SELESAI]
    CheckDisp -- No --> KeepWait[Queue Status: MENUNGGU_OBAT_DAN_BAYAR]
    
    CheckCompl -- No --> MarkSELESAI
    MarkSELESAI --> Print[Print Official Receipt / Kwitansi]
```

---

## 9. Multi-Visit Patient History Flow

SIMPAY supports unlimited historical visits per patient while ensuring complete data isolation:

```mermaid
flowchart TD
    P[Patient: Budi Santoso - RM-00001] --> V1[Visit 1: 2026-08-10 - Queue #1 - Poli Umum]
    P --> V2[Visit 2: 2026-08-25 - Queue #4 - Poli Spesialis]
    P --> V3[Visit 3: Today - Queue #2 - Poli Umum]

    V1 --> MR1[MedicalRecord #1: ISPA / J06.9 - Doctor A]
    V1 --> B1[Billing #1: Rp 80.000 - LUNAS]
    
    V2 --> MR2[MedicalRecord #2: Hipertensi / I10 - Doctor B]
    V2 --> B2[Billing #2: Rp 50.000 - LUNAS]

    V3 --> MR3[MedicalRecord #3: Active Visit - Doctor A]
    V3 --> B3[Billing #3: Active Billing]

    subgraph "History Drawer View (/pasien/[id])"
        Drawer[Reverse Chronological Timeline: V3 -> V2 -> V1]
        Vitals[Latest Vital Signs Summary Panel]
    end
```

---

## 10. Reporting Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Perawat / Dokter
    participant UI as /laporan View
    participant Action as getReportData()
    participant DB as SQLite DB

    User->>UI: Select Date Range (Start Date -> End Date)
    UI->>Action: Invoke getReportData(startDate, endDate)
    Action->>Action: Normalize Date Boundaries (00:00:00.000 to 23:59:59.999)
    Action->>DB: Query MedicalRecord, Queue, Patient, Billing, Payment
    DB-->>Action: Return Raw Database Records
    Action->>Action: Aggregate Revenue, Fee Breakdown, ICD-10 Stats & Demographics
    Action-->>UI: Return ReportData Object
    UI-->>User: Render Interactive Analytics Dashboard & Charts
```

---

## 11. Public Queue Display Flow

- **URL Route**: `/antrean/display`
- **Access Level**: Unauthenticated Public Access (Whitelisted in `middleware.ts`).
- **Data Projection**: `getPublicQueueDisplay()` fetches **ONLY** non-sensitive queue metrics:
  - `queueNumber` (e.g., `#1`)
  - `polyclinic` (e.g., `Poli Umum`)
  - `status` (`MENUNGGU`, `DALAM_PEMERIKSAAN`, `SELESAI`)
  - `date`
- **Privacy Assurance**: Patient names, No. RM, addresses, phone numbers, clinical SOAP notes, diagnoses, prescriptions, and financial amounts are **completely excluded** from the database query projection.

---

## 12. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant Middleware as middleware.ts
    participant LoginAction as loginAction()
    participant AuthGuard as requireAuth() / requireRole()
    participant DB as SQLite DB

    User->>Browser: Enter Email & Password (/login)
    Browser->>LoginAction: Submit Form Data
    LoginAction->>DB: Find User by Email
    alt User Not Found or Invalid Password
        LoginAction-->>Browser: Return { success: false, error: 'Email atau password salah' }
    else Credentials Valid
        LoginAction->>LoginAction: Create Signed JWT Session Token
        LoginAction->>Browser: Set HTTP-Only Cookie (simpay_session, 24h)
        LoginAction-->>Browser: Redirect to /dashboard
    end

    Browser->>Middleware: Access Protected Route (/antrean/1)
    Middleware->>Middleware: Verify simpay_session Cookie
    alt Unauthenticated
        Middleware-->>Browser: Redirect to /login?from=/antrean/1
    else Authenticated
        alt Doctor Route & Role != DOKTER
            Middleware-->>Browser: Redirect to /antrean (Role Block)
        else Role Allowed
            Middleware-->>Browser: Allow Page Rendering
        end
    end

    Browser->>AuthGuard: Invoke Server Action (e.g. processPayment)
    AuthGuard->>AuthGuard: Execute requireRole('PERAWAT')
    alt Role Mismatch
        AuthGuard-->>Browser: Throw Error: "UNAUTHORIZED: Akses ditolak"
    else Role Match
        AuthGuard-->>Browser: Execute Action Logic & Return Result
    end
```

---

## 13. Error & Validation Handling Matrix

| Error Scenario | Triggering Action | System Validation Check | User-Facing Error Message / Outcome |
|----------------|-------------------|-------------------------|------------------------------------|
| **Invalid Login Credentials** | `loginAction()` | Email existence & password match. | `"Email atau password salah"` |
| **Short Patient Name** | `createPatient()` | Name length < 2 chars. | `"Nama pasien minimal 2 karakter"` |
| **Future DOB** | `createPatient()` | `dateOfBirth > now`. | `"Tanggal lahir tidak boleh di masa depan"` |
| **Invalid Phone Number** | `createPatient()` | Non-numeric or length outside 7–13 digits. | `"Nomor telepon hanya boleh berisi angka (7-13 digit)"` |
| **Insufficient Medicine Stock** | `processPrescriptionQueue()` | Total non-expired stock < required quantity. | `"Stok obat tidak mencukupi untuk [Nama]. Tersedia: X, Dibutuhkan: Y"` (Transaction Aborted) |
| **Cash Deficit Payment** | `processPayment()` | `amountPaid < totalAmount` for `TUNAI`. | `"Uang dibayarkan kurang dari total tagihan"` |
| **Duplicate Payment Attempt** | `processPayment()` | `billing.status === 'LUNAS'` or `billing.payment != null`. | `"Tagihan/Billing ini sudah dilunasi sebelumnya (Duplicate Payment Rejection)"` |
| **Unauthorized Role Attempt** | Server Action | `requireRole('PERAWAT')` or `requireRole('DOKTER')`. | `"UNAUTHORIZED: Akses ditolak. Fungsi ini hanya dapat diakses oleh [ROLE]"` |
| **Unauthenticated Route Access** | Navigation | Cookie `simpay_session` missing or invalid. | Middleware redirects to `/login` |

---

## 14. Thesis Demonstration Flow (10–15 Minutes)

1. **PERAWAT Login**: Log in as `perawat@simpay.local` (`password123`) to access the nurse dashboard.
2. **Patient Registration**: Register a new patient ("Ahmad Fauzi", `Poli Umum`). Show automatic No. RM generation and queue creation (#1 `MENUNGGU`).
3. **Public TV Display**: Open `/antrean/display` in a separate tab to demonstrate the privacy-protected waiting room display callboard.
4. **DOKTER Login & Examination**: Log in as `dokter@simpay.local`. Open Queue #1 (`DALAM_PEMERIKSAAN`). Enter SOAP, vitals (`120/80 mmHg`), diagnosis (`ISPA`), ICD-10 (`J06.9`), and prescriptions (`Paracetamol 500mg`).
5. **Medical Record & Billing Generation**: Save the examination. Show queue status updating to `MENUNGGU_OBAT_DAN_BAYAR` and itemized billing generated.
6. **PERAWAT Pharmacy Dispensing**: Switch to `PERAWAT`, open `/resep`, click *"Serahkan Obat"*, and demonstrate automatic FEFO batch selection.
7. **Cashier Payment Processing**: Open `/pembayaran`, select Queue #1, process a cash payment (`TUNAI`, input Rp 250.000), show change calculation (Rp 50.000), and print receipt (`INV-YYYYMMDD-XXXX`).
8. **Visit Completion**: Observe queue status automatically transitioning to `SELESAI`.
9. **Patient History & Reports**: Open `/pasien/1` to view multi-visit history, and `/laporan` to view live revenue charts and ICD-10 statistics.
10. **Role Protection Demonstration**: Attempt to process payment as `DOKTER` to demonstrate server-side role security.

---

## 15. User Flow Summary Table

| Flow Module | Primary Role | Main Output / Result |
|-------------|--------------|----------------------|
| **Patient Registration** | `PERAWAT` | New `Patient` record + Daily `Queue` (#1 `MENUNGGU`) |
| **Patient Search** | `PERAWAT` / `DOKTER` | Matches `RM-XXXXX`, name, or phone number |
| **Queue Management** | `PERAWAT` / `DOKTER` | Updates polyclinic queue state lifecycle |
| **Doctor Examination** | `DOKTER` | Saves SOAP, vitals, ICD-10, and diagnosis in `MedicalRecord` |
| **Prescription Generation** | `DOKTER` | Snapshots prescription unit prices & creates prescription queue |
| **Pharmacy Dispensing** | `PERAWAT` | Deducts inventory via FEFO & marks prescription `SELESAI` |
| **Billing Calculation** | System | Generates itemized bill (Registration Rp 15k + Consultation Rp 35k + Medicines) |
| **Cashier Payment** | `PERAWAT` | Processes `TUNAI`/`QRIS`/`TRANSFER`, calculates change, generates Invoice |
| **Visit Completion** | System | Automatically updates Queue status to `SELESAI` (Paid + Dispensed) |
| **Medical History** | `DOKTER` / `PERAWAT` | Displays reverse-chronological multi-visit clinical history |
| **Operational & Financial Reports** | `DOKTER` / `PERAWAT` | Live aggregated analytics on revenue, ICD-10, & demographics |
| **Public Queue Display** | Public (Unauthenticated) | Displays privacy-safe queue numbers on waiting room TV (`/antrean/display`) |

---

## 16. Implementation Status

This User Flow specification accurately reflects the **CURRENT SIMPAY implementation**. All workflows, role permissions, state transitions, validation checks, and security boundaries have been verified against the codebase.
