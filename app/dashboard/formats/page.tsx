import { createClient } from '@/lib/supabase/server'
import { FormatsClient } from './formats-client'

export default async function FormatsPage() {
  const supabase = await createClient()

  const { data: formats } = await supabase
    .from('formats')
    .select('*')
    .order('created_at', { ascending: false })

  return <FormatsClient formats={formats ?? []} />
}
