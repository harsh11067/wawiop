'use client'

import { THEME } from '@/lib/constants'

interface WalletVoiceProps {
  voice: string
  voiceId: number
}

export default function WalletVoice({ voice, voiceId }: WalletVoiceProps) {
  return (
    <div style={{ padding: '18px 28px 4px' }}>
      <div
        className="font-mono"
        style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2.6, color: THEME.textFaint }}
      >
        THE WALLET SAYS
      </div>
      <div
        key={voiceId}
        className="font-display animate-fade-up"
        style={{
          marginTop: 8,
          fontStyle: 'italic',
          fontSize: 26,
          color: '#E4DFD2',
          maxWidth: 1150,
          lineHeight: 1.25,
          textWrap: 'pretty',
        }}
      >
        “{voice}”
      </div>
    </div>
  )
}
