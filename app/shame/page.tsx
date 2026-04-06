'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ShameEntry = {
  id: string
  caption: string | null
  created_at: string
  player_id: string
}

export default function ShamePage() {
  const router = useRouter()
  const [entries, setEntries] = useState<ShameEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('shame_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setEntries(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0a0a0a' }}>
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid #222' }}
      >
        <button onClick={() => router.back()} className="text-gray-400 text-xl p-1 -ml-1">
          ←
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">🏛️ Hall of Shame</h1>
          <p className="text-gray-500 text-xs">Players who got fooled</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <span className="text-gray-500 text-sm">Loading...</span>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-gray-400 text-sm">No shame entries yet.</p>
            <p className="text-gray-600 text-xs mt-1">Everyone&apos;s been too clever.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl p-4"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">😵</div>
                <div className="flex-1">
                  <p className="text-white text-sm">{entry.caption ?? 'Got totally played.'}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={() => {
            sessionStorage.clear()
            router.push('/')
          }}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ff2d78, #cc1f5e)', color: '#fff' }}
        >
          Play Again 🎭
        </button>
      </div>
    </div>
  )
}
