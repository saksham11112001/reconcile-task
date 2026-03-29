import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:  'reconcile',
  name: 'Reconcile',
  // eventKey is read from INNGEST_EVENT_KEY env var automatically
})
