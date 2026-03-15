'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineEditFieldProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
  className?: string
}

export function InlineEditField({
  value,
  onSave,
  placeholder,
  className,
}: InlineEditFieldProps) {
  const [localValue, setLocalValue] = useState(value)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const originalRef = useRef(value)

  useEffect(() => {
    setLocalValue(value)
    originalRef.current = value
  }, [value])

  const handleBlur = async () => {
    const trimmed = localValue.trim()
    if (trimmed === originalRef.current) return
    if (!trimmed) {
      setLocalValue(originalRef.current)
      return
    }
    setStatus('saving')
    try {
      await onSave(trimmed)
      originalRef.current = trimmed
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setLocalValue(originalRef.current)
      setStatus('idle')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setLocalValue(originalRef.current)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="relative inline-flex items-center group/field">
      <input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'bg-transparent rounded px-1 py-0.5 transition-all duration-150',
          'border border-transparent',
          'hover:border-muted-foreground/20 hover:bg-muted/40',
          'focus:border-primary/50 focus:bg-background focus:shadow-sm focus:outline-none',
          'placeholder:text-muted-foreground/40',
          className,
        )}
      />
      {status === 'saving' && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1 shrink-0" />
      )}
      {status === 'saved' && (
        <Check className="h-3 w-3 text-emerald-500 ml-1 shrink-0" />
      )}
    </div>
  )
}
