import { create } from 'zustand'
import { INITIAL_STUDENTS, INITIAL_CLASSES, INITIAL_FEE_TYPES } from '../constants'

const useAppStore = create((set) => ({
  // Students
  students: INITIAL_STUDENTS,
  addStudent:    (student)       => set((s) => ({ students: [...s.students, student] })),
  updateStudent: (id, updates)   => set((s) => ({ students: s.students.map(stu => stu.id === id ? { ...stu, ...updates } : stu) })),

  // Classes
  classes: INITIAL_CLASSES,
  setClasses: (classes) => set({ classes }),

  // Fee Types
  feeTypes: INITIAL_FEE_TYPES,
  setFeeTypes: (feeTypes) => set({ feeTypes }),

  // Branding
  branding: { primaryColor:'#6366F1', accentColor:'#10B981', sidebarTheme:'dark', logoText:'VN', logoUrl:null },
  setBranding: (branding) => set(s => ({ branding: { ...s.branding, ...branding } })),

}))

export default useAppStore