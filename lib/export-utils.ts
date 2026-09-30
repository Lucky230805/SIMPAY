import { ReportData } from '@/app/laporan/actions'

/**
 * Format currency to IDR string for exports
 */
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Clean strings for CSV fields (escape quotes and commas)
 */
function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Export report data as a structured UTF-8 CSV file
 */
export function exportReportToCSV(report: ReportData) {
  const lines: string[] = []

  // Header & Title
  lines.push(`"LAPORAN OPERASIONAL & KEUANGAN SIMPAY"`)
  lines.push(`"Periode Laporan",${escapeCSV(report.startDate)} s/d ${escapeCSV(report.endDate)}`)
  lines.push(`"Tanggal Unduh",${escapeCSV(new Date().toLocaleString('id-ID'))}`)
  lines.push('')

  // 1. RINGKASAN METRIK
  lines.push(`"=== RINGKASAN UTAMA ==="`)
  lines.push(`"Metrik","Jumlah / Nilai"`)
  lines.push(`"Total Pemeriksaan Medis",${report.summary.totalExaminations}`)
  lines.push(`"Pasien Baru Terdaftar",${report.summary.newPatients}`)
  lines.push(`"Resep Obat Selesai",${report.summary.completedPrescriptions}`)
  lines.push(`"Total Antrean Registered",${report.summary.totalQueues}`)
  lines.push(`"Total Pendapatan (Lunas)",${escapeCSV(formatIDR(report.financial.totalRevenue))}`)
  lines.push('')

  // 2. KEUANGAN & PEMBAYARAN
  lines.push(`"=== LAPORAN KEUANGAN & PEMBAYARAN ==="`)
  lines.push(`"Metrik Keuangan","Nilai (IDR)"`)
  lines.push(`"Total Pendapatan (Lunas)",${report.financial.totalRevenue}`)
  lines.push(`"Total Tagihan Belum Lunas",${report.financial.totalUnpaidAmount}`)
  lines.push(`"Jumlah Transaksi Lunas",${report.financial.paidCount}`)
  lines.push(`"Jumlah Transaksi Belum Lunas",${report.financial.unpaidCount}`)
  lines.push(`"Rata-rata Transaksi",${report.financial.averageTransaction}`)
  lines.push('')

  lines.push(`"Rincian Komponen Biaya","Jumlah (IDR)"`)
  lines.push(`"Biaya Pendaftaran",${report.financial.feeBreakdown.registrationFee}`)
  lines.push(`"Biaya Konsultasi Dokter",${report.financial.feeBreakdown.consultationFee}`)
  lines.push(`"Biaya Obat-obatan",${report.financial.feeBreakdown.medicineFee}`)
  lines.push(`"Biaya Lainnya",${report.financial.feeBreakdown.otherFee}`)
  lines.push('')

  lines.push(`"Metode Pembayaran","Jumlah Transaksi","Total Nominal (IDR)","Persentase (%)"`)
  report.financial.paymentMethods.forEach((m) => {
    lines.push(`${escapeCSV(m.method)},${m.count},${m.totalAmount},${m.percentage}%`)
  })
  lines.push('')

  // 3. STATISTIK DIAGNOSIS & ICD-10
  lines.push(`"=== STATISTIK DIAGNOSIS & KODE ICD-10 ==="`)
  lines.push(`"Kode ICD-10","Jumlah Kasus"`)
  if (report.examinations.icd10.length === 0) {
    lines.push(`"Belum ada data ICD-10",0`)
  } else {
    report.examinations.icd10.forEach((item) => {
      lines.push(`${escapeCSV(item.code)},${item.count}`)
    })
  }
  lines.push('')

  lines.push(`"Deskripsi Diagnosis Medis","Jumlah Pasien"`)
  if (report.examinations.diagnoses.length === 0) {
    lines.push(`"Belum ada data diagnosis",0`)
  } else {
    report.examinations.diagnoses.forEach((item) => {
      lines.push(`${escapeCSV(item.name)},${item.count}`)
    })
  }
  lines.push('')

  // 4. DEMOGRAFI PASIEN
  lines.push(`"=== DEMOGRAFI PASIEN ==="`)
  lines.push(`"Jenis Kelamin","Jumlah Pasien","Persentase (%)"`)
  report.demographics.gender.forEach((g) => {
    lines.push(`${escapeCSV(g.gender)},${g.count},${g.percentage}%`)
  })
  lines.push('')

  lines.push(`"Kelompok Usia","Jumlah Pasien","Persentase (%)"`)
  report.demographics.ageGroups.forEach((a) => {
    lines.push(`${escapeCSV(a.group)},${a.count},${a.percentage}%`)
  })
  lines.push('')

  // 5. RESEP & FARMASI
  lines.push(`"=== PENGGUNAAN OBAT & RESEP ==="`)
  lines.push(`"Nama Obat","Jumlah Diresepkan"`)
  if (report.prescriptions.medicines.length === 0) {
    lines.push(`"Belum ada resep obat",0`)
  } else {
    report.prescriptions.medicines.forEach((m) => {
      lines.push(`${escapeCSV(m.name)},${m.count}`)
    })
  }
  lines.push('')

  // 6. ANTREAN & OPERASIONAL
  lines.push(`"=== ANTREAN & OPERASIONAL POLI ==="`)
  lines.push(`"Poliklinik","Jumlah Antrean"`)
  report.queues.byPolyclinic.forEach((p) => {
    lines.push(`${escapeCSV(p.polyclinic)},${p.count}`)
  })
  lines.push('')

  lines.push(`"Status Antrean","Jumlah"`)
  report.queues.byStatus.forEach((s) => {
    lines.push(`${escapeCSV(s.status)},${s.count}`)
  })

  // UTF-8 BOM byte sequence to ensure correct encoding in Excel
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `Laporan_SIMPAY_${report.startDate}_sd_${report.endDate}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export report data as an HTML Spreadsheet (.xls) compatible with Excel
 */
export function exportReportToExcel(report: ReportData) {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan SIMPAY</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; }
        table { border-collapse: collapse; margin-bottom: 20px; width: 100%; }
        th { background-color: #059669; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #047857; text-align: left; }
        td { padding: 6px 8px; border: 1px solid #cbd5e1; }
        .title { font-size: 16pt; font-weight: bold; color: #047857; }
        .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 15px; }
        .section-header { font-size: 12pt; font-weight: bold; background-color: #f1f5f9; color: #0f172a; padding: 6px; border: 1px solid #cbd5e1; }
        .number { text-align: right; }
        .center { text-align: center; }
        .total-row { font-weight: bold; background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="title">SIMPAY &mdash; LAPORAN OPERASIONAL &amp; KEUANGAN KLINIK</div>
      <div class="subtitle">Periode Laporan: <strong>${report.startDate}</strong> s/d <strong>${report.endDate}</strong> | Diunduh pada: ${new Date().toLocaleString('id-ID')}</div>

      <!-- RINGKASAN METRIK -->
      <table>
        <tr><td colspan="2" class="section-header">1. RINGKASAN UTAMA</td></tr>
        <tr><th>Indikator Metrik</th><th>Nilai / Jumlah</th></tr>
        <tr><td>Total Pemeriksaan Medis Pasien</td><td class="number"><strong>${report.summary.totalExaminations}</strong></td></tr>
        <tr><td>Pasien Baru Terdaftar</td><td class="number"><strong>${report.summary.newPatients}</strong></td></tr>
        <tr><td>Resep Obat Diselesaikan (Farmasi)</td><td class="number"><strong>${report.summary.completedPrescriptions}</strong></td></tr>
        <tr><td>Total Antrean Pelayanan</td><td class="number"><strong>${report.summary.totalQueues}</strong></td></tr>
        <tr class="total-row"><td>Total Pendapatan Kasir (Lunas)</td><td class="number">${formatIDR(report.financial.totalRevenue)}</td></tr>
      </table>

      <!-- KEUANGAN -->
      <table>
        <tr><td colspan="4" class="section-header">2. LAPORAN KEUANGAN &amp; RINGKASAN KASIR</td></tr>
        <tr><th>Indikator Keuangan</th><th colspan="3" class="number">Nominal (IDR)</th></tr>
        <tr><td>Total Pendapatan (Status Lunas)</td><td colspan="3" class="number"><strong>${formatIDR(report.financial.totalRevenue)}</strong></td></tr>
        <tr><td>Total Tagihan Belum Lunas (Pending)</td><td colspan="3" class="number">${formatIDR(report.financial.totalUnpaidAmount)}</td></tr>
        <tr><td>Rata-rata Transaksi Per Pasien</td><td colspan="3" class="number">${formatIDR(report.financial.averageTransaction)}</td></tr>
        
        <tr><td colspan="4" style="background:#e2e8f0; font-weight:bold;">Rincian Komponen Biaya Layanan</td></tr>
        <tr><td>Biaya Pendaftaran Pasien</td><td colspan="3" class="number">${formatIDR(report.financial.feeBreakdown.registrationFee)}</td></tr>
        <tr><td>Biaya Konsultasi Dokter</td><td colspan="3" class="number">${formatIDR(report.financial.feeBreakdown.consultationFee)}</td></tr>
        <tr><td>Biaya Penjualan Obat-obatan</td><td colspan="3" class="number">${formatIDR(report.financial.feeBreakdown.medicineFee)}</td></tr>
        <tr><td>Biaya Layanan Lainnya</td><td colspan="3" class="number">${formatIDR(report.financial.feeBreakdown.otherFee)}</td></tr>

        <tr><td colspan="4" style="background:#e2e8f0; font-weight:bold;">Distribusi Metode Pembayaran</td></tr>
        <tr><th>Metode Pembayaran</th><th class="center">Jumlah Transaksi</th><th class="number">Total Nominal</th><th class="center">Persentase</th></tr>
        ${report.financial.paymentMethods
          .map(
            (m) => `
          <tr>
            <td>${m.method}</td>
            <td class="center">${m.count}</td>
            <td class="number">${formatIDR(m.totalAmount)}</td>
            <td class="center">${m.percentage}%</td>
          </tr>
        `
          )
          .join('')}
      </table>

      <!-- ICD-10 & DIAGNOSIS -->
      <table>
        <tr><td colspan="2" class="section-header">3. STATISTIK DIAGNOSIS &amp; ICD-10</td></tr>
        <tr><th>Kode ICD-10</th><th class="center">Jumlah Kasus</th></tr>
        ${
          report.examinations.icd10.length === 0
            ? '<tr><td colspan="2" class="center">Belum ada data ICD-10</td></tr>'
            : report.examinations.icd10
                .map(
                  (item) => `
            <tr><td><strong>${item.code}</strong></td><td class="center">${item.count}</td></tr>
          `
                )
                .join('')
        }
      </table>

      <!-- DEMOGRAFI -->
      <table>
        <tr><td colspan="3" class="section-header">4. DEMOGRAFI PASIEN</td></tr>
        <tr><th>Jenis Kelamin</th><th class="center">Jumlah Pasien</th><th class="center">Persentase</th></tr>
        ${report.demographics.gender
          .map(
            (g) => `
          <tr><td>${g.gender}</td><td class="center">${g.count}</td><td class="center">${g.percentage}%</td></tr>
        `
          )
          .join('')}
        <tr><th colspan="3" style="background:#e2e8f0; color:#0f172a;">Kelompok Usia</th></tr>
        <tr><th>Kategori Umur</th><th class="center">Jumlah Pasien</th><th class="center">Persentase</th></tr>
        ${report.demographics.ageGroups
          .map(
            (a) => `
          <tr><td>${a.group} Tahun</td><td class="center">${a.count}</td><td class="center">${a.percentage}%</td></tr>
        `
          )
          .join('')}
      </table>

      <!-- RESEP & OBAT -->
      <table>
        <tr><td colspan="2" class="section-header">5. STATISTIK PENGGUNAAN OBAT</td></tr>
        <tr><th>Nama Obat</th><th class="center">Jumlah Diresepkan</th></tr>
        ${
          report.prescriptions.medicines.length === 0
            ? '<tr><td colspan="2" class="center">Belum ada data resep obat</td></tr>'
            : report.prescriptions.medicines
                .map(
                  (m) => `
            <tr><td>${m.name}</td><td class="center">${m.count}</td></tr>
          `
                )
                .join('')
        }
      </table>

      <!-- OPERASIONAL ANTREAN -->
      <table>
        <tr><td colspan="2" class="section-header">6. OPERASIONAL ANTREAN POLIKLINIK</td></tr>
        <tr><th>Nama Poliklinik</th><th class="center">Jumlah Antrean</th></tr>
        ${report.queues.byPolyclinic
          .map(
            (p) => `
          <tr><td>${p.polyclinic}</td><td class="center">${p.count}</td></tr>
        `
          )
          .join('')}
      </table>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `Laporan_SIMPAY_${report.startDate}_sd_${report.endDate}.xls`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
