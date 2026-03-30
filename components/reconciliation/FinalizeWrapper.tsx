'use client'

import { useState } from 'react'
import { FinalizeButton } from './FinalizeButton'

interface Props {
  reconId:     string
  isFinalized: boolean
  openCount:   number
  canFinalize: boolean
}

export function FinalizeWrapper({ reconId, isFinalized: initial, openCount, canFinalize }: Props) {
  const [isFinalized, setIsFinalized] = useState(initial)

  return (
    <FinalizeButton
      reconId={reconId}
      isFinalized={isFinalized}
      openCount={openCount}
      canFinalize={canFinalize}
      onToggle={setIsFinalized}
    />
  )
}
