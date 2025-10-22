import { createClient } from '@base44/sdk';

// Mock client for local development
export const base44 = {
  auth: {
    me: async () => ({
      email: "local-dev@example.com",
      full_name: "Local Developer",
      role: "admin",
      verified: true
    }),
    loginWithRedirect: async () => null,
    logout: async () => null
  },
  entities: {
    Market: {
      filter: async () => ([]),
      findById: async () => null
    },
    Order: {
      filter: async () => ([])
    },
    Position: {
      filter: async () => ([])
    }
  },
  functions: {
    ensureUserBonus: async () => ({ success: true }),
    calculatePortfolio: async () => ({ data: { total_value: 100 } })
  }
};
