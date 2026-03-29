import { create } from 'zustand'

// Rehydrate children from localStorage at module load time
const _storedChildren = (() => {
  try {
    const raw = localStorage.getItem('parentChildren')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
})()

// Rehydrate activeStudent by matching stored ID against stored children
const _storedActiveStudent = (() => {
  try {
    const id = localStorage.getItem('activeStudentId')
    if (!id || !_storedChildren.length) return null
    return _storedChildren.find(c => String(c.student_id) === id) || null
  } catch { return null }
})()

const useParentStore = create((set) => ({
  activeStudent: _storedActiveStudent,
  children: _storedChildren,

  setActiveStudent: (student) => {
    localStorage.setItem('activeStudentId', String(student.student_id))
    set({ activeStudent: student })
  },

  setChildren: (children) => {
    localStorage.setItem('parentChildren', JSON.stringify(children))
    set({ children })
    // Keep activeStudent in sync if it's in the new list
    const savedId = localStorage.getItem('activeStudentId')
    if (savedId) {
      const match = children.find(c => String(c.student_id) === savedId)
      if (match) set({ activeStudent: match })
    }
  },

  clearParent: () => {
    localStorage.removeItem('activeStudentId')
    localStorage.removeItem('parentChildren')
    set({ activeStudent: null, children: [] })
  },
}))

export default useParentStore
