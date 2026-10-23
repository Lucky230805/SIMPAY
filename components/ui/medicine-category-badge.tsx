'use client'

import React from 'react'

export interface MedicineCategoryBadgeProps {
  category?: string | null
  brandType?: 'GENERIK' | 'PATEN_BERMEREK' | string | null
  brandName?: string | null
  genericName?: string | null
  showLabel?: boolean
  showDescription?: boolean
  showBrandBadge?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MedicineCategoryBadge({
  category = 'Obat Bebas',
  brandType,
  brandName,
  genericName,
  showLabel = true,
  showDescription = false,
  showBrandBadge = false,
  size = 'md',
  className = '',
}: MedicineCategoryBadgeProps) {
  const catLower = (category || '').toLowerCase().trim()

  // Dimensions based on size
  let containerSize = 'w-4 h-4'
  let strokeWidth = '2'
  if (size === 'sm') containerSize = 'w-3.5 h-3.5'
  if (size === 'lg') containerSize = 'w-5 h-5'

  let symbolNode: React.ReactNode = null
  let labelText = category || 'Obat Bebas'
  let descriptionText = ''

  // 1. NARKOTIKA (Lingkaran Putih, Border Merah, Palang Medali Merah)
  if (catLower.includes('narkotik')) {
    labelText = 'Obat Narkotika'
    descriptionText = 'Obat yang berasal dari tanaman atau sintetis berpotensi ketergantungan sangat tinggi. Wajib resep dokter & pelaporan khusus Kemenkes/SIPNAP.'
    symbolNode = (
      <span
        title="Obat Narkotika (Lingkaran Putih Tepi Merah, Palang Medali Merah)"
        className={`${containerSize} rounded-full bg-white border-2 border-red-600 shrink-0 inline-flex items-center justify-center p-0.5 shadow-xs`}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full text-red-600 fill-current">
          {/* Palang Medali Merah (Cross of Malta / Flaring cross) */}
          <path d="M9 2h6v5l3-3 2 2-3 3h5v6h-5l3 3-2 2-3-3v5H9v-5l-3 3-2-2 3-3H2V9h5l-3-3 2-2 3 3V2z" />
        </svg>
      </span>
    )
  }
  // 2. OBAT KERAS (Lingkaran Merah, Border Hitam, Huruf K)
  else if (catLower.includes('keras') || catLower.includes('psikotropika') || catLower === 'k') {
    labelText = 'Obat Keras'
    descriptionText = 'Hanya boleh diperoleh dengan resep dokter di apotek atau faskes berizin (mis. antibiotik, obat hipertensi, dsb).'
    symbolNode = (
      <span
        title="Obat Keras (Lingkaran Merah Tepi Hitam, Huruf K)"
        className={`${containerSize} rounded-full bg-red-600 border-2 border-black text-black font-black shrink-0 inline-flex items-center justify-center leading-none select-none shadow-xs text-[10px]`}
      >
        K
      </span>
    )
  }
  // 3. OBAT BEBAS TERBATAS (Lingkaran Biru Tua, Border Hitam)
  else if (catLower.includes('bebas terbatas') || (catLower.includes('terbatas') && !catLower.includes('tindakan'))) {
    labelText = 'Obat Bebas Terbatas'
    descriptionText = 'Obat keras yang dapat dibeli tanpa resep dokter dalam batas jumlah tertentu, disertai tanda peringatan P.No 1 s/d P.No 6.'
    symbolNode = (
      <span
        title="Obat Bebas Terbatas (Lingkaran Biru Tepi Hitam)"
        className={`${containerSize} rounded-full bg-blue-700 border-2 border-black shrink-0 inline-block align-middle shadow-xs`}
      />
    )
  }
  // 4. OBAT FITOFARMAKA (Lingkaran Kuning, Border Hijau, Ranting Kristal/Salju)
  else if (catLower.includes('fitofarmaka')) {
    labelText = 'Obat Fitofarmaka'
    descriptionText = 'Obat bahan alam yang telah dibuktikan keamanan dan khasiatnya secara ilmiah melalui uji praklinis dan uji klinis manusia.'
    symbolNode = (
      <span
        title="Obat Fitofarmaka (Lingkaran Kuning Tepi Hijau, Simbol Kristal Salju)"
        className={`${containerSize} rounded-full bg-yellow-400 border-2 border-emerald-600 shrink-0 inline-flex items-center justify-center p-0.5 shadow-xs`}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full text-emerald-700 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round">
          {/* Kristal ranting salju */}
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="3" y1="7" x2="21" y2="17" />
          <line x1="3" y1="17" x2="21" y2="7" />
          <path d="M12 5l-2-2m4 0l-2 2M12 19l-2 2m4 0l-2-2" />
          <path d="M5 8l-2 0m2-2l-1 2" />
          <path d="M19 16l2 0m-2 2l1-2" />
        </svg>
      </span>
    )
  }
  // 5. OBAT HERBAL TERSTANDAR (OHT) (Lingkaran Kuning, Border Hijau, 3 Bintang Daun)
  else if (catLower.includes('herbal') || catLower.includes('oht')) {
    labelText = 'Obat Herbal Terstandar'
    descriptionText = 'Obat bahan alam yang telah dibuktikan keamanan dan khasiatnya melalui uji praklinis dan bahan bakunya telah distandarisasi.'
    symbolNode = (
      <span
        title="Obat Herbal Terstandar (Lingkaran Kuning Tepi Hijau, 3 Jari Daun)"
        className={`${containerSize} rounded-full bg-yellow-400 border-2 border-emerald-600 shrink-0 inline-flex items-center justify-center p-0.5 shadow-xs`}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full text-emerald-700 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round">
          {/* 3 Bintang/Jari daun */}
          <line x1="12" y1="4" x2="12" y2="10" />
          <line x1="9" y1="6" x2="15" y2="8" />
          <line x1="9" y1="8" x2="15" y2="6" />

          <line x1="6" y1="14" x2="6" y2="20" />
          <line x1="3" y1="16" x2="9" y2="18" />
          <line x1="3" y1="18" x2="9" y2="16" />

          <line x1="18" y1="14" x2="18" y2="20" />
          <line x1="15" y1="16" x2="21" y2="18" />
          <line x1="15" y1="18" x2="21" y2="16" />
        </svg>
      </span>
    )
  }
  // 6. OBAT JAMU (Lingkaran Putih, Border Hijau, Ranting Daun Hijau)
  else if (catLower.includes('jamu') || catLower.includes('tradisional')) {
    labelText = 'Obat Jamu'
    descriptionText = 'Obat tradisional berbahan dasar tanaman yang khasiatnya dibuktikan secara empiris turun-temurun.'
    symbolNode = (
      <span
        title="Obat Jamu (Lingkaran Putih Tepi Hijau, Ranting Daun)"
        className={`${containerSize} rounded-full bg-white border-2 border-emerald-600 shrink-0 inline-flex items-center justify-center p-0.5 shadow-xs`}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full text-emerald-600 stroke-current" fill="none" strokeWidth="2.2" strokeLinecap="round">
          {/* Batang & daun */}
          <line x1="12" y1="21" x2="12" y2="3" />
          <path d="M12 7c-3-2-5 0-5 2s2 2 5 0" />
          <path d="M12 7c3-2 5 0 5 2s-2 2-5 0" />
          <path d="M12 12c-3-2-5 0-5 2s2 2 5 0" />
          <path d="M12 12c3-2 5 0 5 2s-2 2-5 0" />
          <path d="M12 17c-3-2-5 0-5 2s2 2 5 0" />
          <path d="M12 17c3-2 5 0 5 2s-2 2-5 0" />
        </svg>
      </span>
    )
  }
  // 7. OBAT BEBAS (Lingkaran Hijau, Border Hitam)
  else if (catLower.includes('bebas') || catLower === 'obat bebas' || catLower === 'umum' || !catLower) {
    labelText = 'Obat Bebas'
    descriptionText = 'Obat yang paling aman dan dapat dibeli bebas di apotek/toko obat tanpa resep dokter (mis. parasetamol, vitamin).'
    symbolNode = (
      <span
        title="Obat Bebas (Lingkaran Hijau Tepi Hitam)"
        className={`${containerSize} rounded-full bg-emerald-600 border-2 border-black shrink-0 inline-block align-middle shadow-xs`}
      />
    )
  }
  // NON-OBAT / TINDAKAN
  else {
    labelText = category || 'Layanan / Tindakan'
    descriptionText = ''
    symbolNode = (
      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 inline-block align-middle" />
    )
  }

  const isGenerik = brandType === 'GENERIK' || (!brandType && !brandName)

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {symbolNode}
        {showLabel && (
          <span className="font-semibold text-foreground text-xs tracking-tight">{labelText}</span>
        )}
        {showBrandBadge && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
              isGenerik
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
            }`}
          >
            {isGenerik ? 'Generik' : 'Paten / Bermerek'}
          </span>
        )}
      </div>
      {showDescription && descriptionText && (
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{descriptionText}</p>
      )}
    </div>
  )
}
