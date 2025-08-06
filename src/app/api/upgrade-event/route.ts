import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, eventCode } = body

    if (!eventId || !eventCode) {
      return NextResponse.json(
        { error: 'Event ID and event code are required' },
        { status: 400 }
      )
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client and set the access token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Set the session using the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the user owns the event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, user_id, name, upload_limit')
      .eq('id', eventId)
      .eq('event_code', eventCode)
      .eq('user_id', user.id)
      .single()

    if (eventError || !eventData) {
      console.error('Event error:', eventError)
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      )
    }

    // Check if event already has upgraded limit
    if (eventData.upload_limit >= 200) {
      return NextResponse.json(
        { error: 'Event already upgraded to 200 uploads' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // The price ID for your $4.99 upgrade
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/event/${eventCode}/dashboard?upgrade=success`,
      cancel_url: `${request.nextUrl.origin}/event/${eventCode}/dashboard?upgrade=cancelled`,
      metadata: {
        eventId: eventId,
        userId: user.id,
        eventCode: eventCode,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}