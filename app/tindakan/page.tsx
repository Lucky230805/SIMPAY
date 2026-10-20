import { getProceduresAction } from './actions'
import { getCurrentUser } from '@/lib/auth'
import { ProcedureCatalogView } from '@/components/tindakan/procedure-catalog-view'

export const dynamic = 'force-dynamic'

export default async function TindakanPage() {
  const [res, user] = await Promise.all([
    getProceduresAction(),
    getCurrentUser(),
  ])

  const initialProcedures = res.success && res.data ? res.data : []
  const userRole = user?.role === 'DOKTER' ? 'DOKTER' : 'PERAWAT'

  return (
    <ProcedureCatalogView
      initialProcedures={initialProcedures}
      userRole={userRole}
    />
  )
}
