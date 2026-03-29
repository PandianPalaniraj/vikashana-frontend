import { create } from 'zustand'

const useSubscriptionStore = create((set, get) => ({
  plan:            'pro',
  status:          'trial',
  billingCycle:    'monthly',
  trialEndsAt:     null,
  trialDaysLeft:   30,
  renewalDate:     null,
  mobileEnabled:   true,
  studentCount:    0,
  monthlyAmount:   0,
  isTrial:         false,
  isBlocked:       false,
  isGracePeriod:   false,
  graceDaysLeft:   0,
  limits: {
    max_students: 999999,
    max_teachers: 999999,
    mobile: true,
    modules: 'all',
  },

  setSubscription: (data) => set({
    plan:          data.plan,
    status:        data.status,
    billingCycle:  data.billing_cycle,
    trialEndsAt:   data.trial_ends_at,
    trialDaysLeft: data.trial_days_left ?? 0,
    renewalDate:   data.renewal_date,
    mobileEnabled: data.mobile_enabled,
    studentCount:  data.student_count,
    monthlyAmount: data.monthly_amount,
    isTrial:       data.is_trial,
    isBlocked:     data.is_blocked,
    isGracePeriod: data.is_grace_period,
    graceDaysLeft: data.grace_days_left,
    limits:        data.limits,
  }),

  isProOrAbove:     () => ['pro', 'premium', 'enterprise'].includes(get().plan),
  isPremiumOrAbove: () => ['premium', 'enterprise'].includes(get().plan),
  isActive:         () => ['active', 'trial'].includes(get().status),
}))

export default useSubscriptionStore
