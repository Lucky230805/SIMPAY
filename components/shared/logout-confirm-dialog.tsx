'use client'

import React, { useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2, AlertTriangle } from 'lucide-react'
import { logoutAction } from '@/app/login/actions'

interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogoutConfirmDialog({ open, onOpenChange }: LogoutConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-800">
            Konfirmasi Keluar Aplikasi
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin keluar dari akun SIMPAY? Sesi Anda akan diakhiri dan Anda perlu melakukan login kembali untuk mengakses sistem.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full sm:w-auto text-slate-700"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 font-semibold flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
