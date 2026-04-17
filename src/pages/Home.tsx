import BoardTable from '@/components/BoardTable'
import LoginDialog from '@/components/LoginDialog'
import { useHydrateAuth } from '@/hooks/useHydrateAuth'
import { useAuthStore } from '@/stores/authStore'

export default function Home() {
  useHydrateAuth()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,237,213,0.75),rgba(255,255,255,0.9)_40%,rgba(250,250,249,1)_70%)] px-3 py-4">
      <div className="mx-auto flex h-[calc(100vh-32px)] w-full max-w-none flex-col">
        <div className="flex-1">
          {user ? <BoardTable /> : <LoginDialog />}
        </div>
      </div>
    </div>
  )
}
