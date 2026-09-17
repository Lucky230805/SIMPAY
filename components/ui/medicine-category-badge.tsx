'use client'

import React from 'react'

export interface MedicineCategoryBadgeProps {
  category?: string | null
  showLabel?: boolean
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MedicineCategoryBadge({
  category = 'Obat Bebas',
  showLabel = true,
  showDescription = false,
  size = 'md',
  className = '',
}: MedicineCategoryBadgeProps) {
  const catLower = (category || '').toLowerCase().trim()

  const isObatBebasTerbatas = catLower.includes('bebas terbatas') || (catLower.includes('terbatas') && !catLower.includes('tindakan'))
  const isObatKeras = catLower.includes('keras') || catLower.includes('psikotropika') || catLower.includes('narkotika') || catLower === 'k'
  const isObatBebas = catLower === 'obat bebas' || (catLower.includes('bebas') && !isObatBebasTerbatas) || catLower === 'umum'

  // Dimensions based on size
  let dotSizeClass = 'w-4 h-4 text-[10px]'
  if (size === 'sm') dotSizeClass = 'w-3.5 h-3.5 text-[9px]'
  if (size === 'lg') dotSizeClass = 'w-5 h-5 text-[11px]'

  let symbolNode: React.ReactNode = null
  let labelText = category || 'Obat Bebas'
  let descriptionText = ''

  if (isObatBebasTerbatas) {
    labelText = 'Obat Bebas Terbatas'
    descriptionText = 'Obat keras yang dapat dibeli tanpa resep dokter dalam jumlah terbatas, disertai tanda peringatan khusus (mis. obat flu, pereda nyeri).'
    symbolNode = (
      <span
        title="Obat Bebas Terbatas (Lingkaran Biru Tepi Hitam)"
        className={`${dotSizeClass} rounded-full bg-blue-600 border-2 border-slate-900 shrink-0 inline-block align-middle shadow-xs`}
      />
    )
  } else if (isObatKeras) {
    labelText = 'Obat Keras & Psikotropika'
    descriptionText = 'Hanya boleh diperoleh dengan resep dokter di apotek (mis. antibiotik, obat resep).'
    symbolNode = (
      <span
        title="Obat Keras & Psikotropika (Huruf K dalam Lingkaran Merah Tepi Hitam)"
        className={`${dotSizeClass} rounded-full bg-red-600 border-2 border-slate-900 text-slate-950 font-black shrink-0 inline-flex items-center justify-center leading-none select-none shadow-xs`}
      >
        K
      </span>
    )
  } else if (isObatBebas || catLower.includes('obat') || !catLower) {
    labelText = 'Obat Bebas'
    descriptionText = 'Obat paling aman dan dapat dibeli bebas tanpa resep dokter (mis. parasetamol, vitamin).'
    symbolNode = (
      <span
        title="Obat Bebas (Lingkaran Hijau Tepi Hitam)"
        className={`${dotSizeClass} rounded-full bg-emerald-500 border-2 border-slate-900 shrink-0 inline-block align-middle shadow-xs`}
      />
    )
  } else {
    // Non-medicine or custom category (e.g. Tindakan)
    labelText = category || 'Layanan / Tindakan'
    descriptionText = ''
    symbolNode = (
      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 inline-block align-middle" />
    )
  }

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      <div className="inline-flex items-center gap-1.5">
        {symbolNode}
        {showLabel && (
          <span className="font-bold text-slate-800 text-xs tracking-tight">{labelText}</span>
        )}
      </div>
      {showDescription && descriptionText && (
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{descriptionText}</p>
      )}
    </div>
  )
}
