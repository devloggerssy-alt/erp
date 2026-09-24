import { defineResource } from './resource.types'

export const aiResource = defineResource({
  key: 'ai',

  routes: {
    model: '/ai/model',
    conversations: '/ai/conversations',
    conversation: '/ai/conversations/{id}',
    messages: '/ai/conversations/{id}/messages',
    chat: '/ai/conversations/{id}/chat',
  },
})
