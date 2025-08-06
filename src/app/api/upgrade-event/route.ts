import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  })
  try {
    const body = await request.json()
    const { eventId, eventCode, planType = 'basic' } = body

    if (!eventId || !eventCode) {
      return NextResponse.json(
        { error: 'Event ID and event code are required' },
        { status: 400 }
      )
    }

    // Validate plan type
    const validPlans = ['basic', 'premium', 'deluxe']
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
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

    // Get plan configuration
    const planConfig = {
      basic: {
        priceId: process.env.STRIPE_PRICE_ID_BASIC!,
        uploadLimit: 500,
        name: 'Basic Plan'
      },
      premium: {
        priceId: process.env.STRIPE_PRICE_ID_PREMIUM!,
        uploadLimit: 1000,
        name: 'Premium Plan'
      },
      deluxe: {
        priceId: process.env.STRIPE_PRICE_ID_DELUXE!,
        uploadLimit: 5000, 
        name: 'Deluxe Plan'
      }
    }

    const selectedPlan = planConfig[planType as keyof typeof planConfig]
    if (!selectedPlan.priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${planType} plan` },
        { status: 500 }
      )
    }

    // Check if event already has this plan or higher
    const currentUploadLimit = eventData.upload_limit
    if (currentUploadLimit >= selectedPlan.uploadLimit) {
      return NextResponse.json(
        { error: `Event already has ${selectedPlan.name} or higher` },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/event/${eventCode}/dashboard?upgrade=success&plan=${planType}`,
      cancel_url: `${request.nextUrl.origin}/event/${eventCode}/dashboard?upgrade=cancelled`,
      metadata: {
        eventId: eventId,
        userId: user.id,
        eventCode: eventCode,
        planType: planType,
        uploadLimit: selectedPlan.uploadLimit.toString(),
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