import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoClient } from './demoClient'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Demomodus (`npm run demo`): voorbeeldgegevens in het geheugen, geen database nodig.
export const isDemo = import.meta.env.VITE_DEMO === 'true'

export const isConfigured = isDemo || Boolean(url && anonKey)

// Zonder .env maken we een placeholder-client, zodat de app een duidelijke
// melding kan tonen in plaats van te crashen.
export const supabase: SupabaseClient = isDemo
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key')
