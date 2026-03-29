import { serve }                  from 'inngest/next'
import { inngest }                from '@/lib/inngest/client'
import { processReconciliation }  from '@/lib/inngest/functions/process-reconciliation'
import { recurringDailyCheck }    from '@/lib/inngest/functions/recurring-daily'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReconciliation,
    recurringDailyCheck,
  ],
})
