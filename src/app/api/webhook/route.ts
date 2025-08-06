import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  })
}

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration is missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

function getEndpointSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received')
  
  try {
    const stripe = getStripe()
    const supabaseAdmin = getSupabaseAdmin()
    const endpointSecret = getEndpointSecret()
    
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    console.log('📝 Environment check:', {
      hasEndpointSecret: !!endpointSecret,
      hasSignature: !!signature,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
    })

    if (!signature) {
      console.error('❌ No Stripe signature found')
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
      console.log('✅ Webhook signature verified. Event type:', event.type)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      console.log('💳 Processing checkout.session.completed event')
      const session = event.data.object as Stripe.Checkout.Session

      // Extract metadata
      const eventId = session.metadata?.eventId
      const userId = session.metadata?.userId
      const eventCode = session.metadata?.eventCode

      console.log('📋 Session metadata:', { eventId, userId, eventCode, paymentStatus: session.payment_status })

      if (!eventId || !userId) {
        console.error('❌ Missing metadata in webhook:', { eventId, userId, eventCode })
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        )
      }

      try {
        // First, check current event state
        const { data: currentEvent, error: fetchError } = await supabaseAdmin
          .from('events')
          .select('id, upload_limit, name')
          .eq('id', eventId)
          .eq('user_id', userId)
          .single()

        if (fetchError) {
          console.error('❌ Failed to fetch current event:', fetchError)
          return NextResponse.json(
            { error: 'Failed to fetch event' },
            { status: 500 }
          )
        }

        console.log('📊 Current event state:', currentEvent)

        // Update event upload limit to 200 using admin client
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('events')
          .update({ 
            upload_limit: 200,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId)
          .eq('user_id', userId)
          .select()

        if (updateError) {
          console.error('❌ Failed to update event upload limit:', updateError)
          return NextResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
          )
        }

        console.log('✅ Successfully upgraded event:', updateData)
        console.log(`🎉 Event ${eventId} upgraded from ${currentEvent.upload_limit} to 200 uploads for user ${userId}`)
        
        return NextResponse.json({ received: true })
      } catch (dbError) {
        console.error('❌ Database error during event upgrade:', dbError)
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }
    } else {
      console.log('ℹ️ Ignoring event type:', event.type)
    }

    // For other event types, return success
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}