import { supabase } from './supabase'

export function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

export async function generateUniqueEventCode(): Promise<string> {
  let code = generateEventCode()
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('events')
      .select('event_code')
      .eq('event_code', code)
      .single()
    
    if (error && error.code === 'PGRST116') {
      return code
    }
    
    if (error) {
      console.error('Error checking event code uniqueness:', error)
      throw new Error('Failed to generate unique event code')
    }
    
    if (!data) {
      return code
    }
    
    code = generateEventCode()
    attempts++
  }
  
  throw new Error('Failed to generate unique event code after multiple attempts')
}