import { defineResource } from './resource.types'

export const onboardingResource = defineResource({
  key: 'onboarding',

  routes: {
    company: '/onboarding/step/company',
    fiscalYear: '/onboarding/step/fiscal-year',
    chartOfAccounts: '/onboarding/step/chart-of-accounts',
    glDefaults: '/onboarding/step/gl-defaults',
    currencies: '/onboarding/step/currencies',
    documentSequences: '/onboarding/step/document-sequences',
    complete: '/onboarding/complete',
  },
})
