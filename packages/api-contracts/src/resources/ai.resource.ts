import { defineResource } from './resource.types'

export const aiResource = defineResource({
  key: 'ai',

  routes: {
    model: '/ai/model',
    sessions: '/ai/sessions',
    sessionDetails: '/ai/sessions/:id',
    sendMessage: '/ai/sessions/:id/messages',
  },

  paths: {
    root: 'ai',
    model: 'model',
    sessions: 'sessions',
    sessionById: 'sessions/:id',
    sessionMessages: 'sessions/:id/messages',
  },
})
