import { useState } from 'react'

export default function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return [toast, showToast]
}
