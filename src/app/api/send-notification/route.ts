import { NextRequest, NextResponse } from 'next/server'
import notificationapi from 'notificationapi-node-server-sdk'

// Initialize NotificationAPI only if credentials are available
if (process.env.NOTIFICATIONAPI_CLIENT_ID && process.env.NOTIFICATIONAPI_CLIENT_SECRET) {
  notificationapi.init(
    process.env.NOTIFICATIONAPI_CLIENT_ID,
    process.env.NOTIFICATIONAPI_CLIENT_SECRET
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key (use service role for internal system calls)
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.INTERNAL_API_KEY
    
    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      userId, 
      sensorId, 
      sensorName, 
      measuremateName,
      currentValue, 
      thresholdValue, 
      thresholdType, // 'upper' | 'lower'
      userEmail 
    } = body

    // Validate required fields
    if (!userId || !sensorId || !currentValue || !thresholdValue || !thresholdType || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create service client for database operations
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if we can send notification (spam prevention)
    const { data: canSend } = await supabaseService
      .rpc('can_send_notification', { p_user_id: userId })

    if (!canSend) {
      return NextResponse.json(
        { 
          message: 'Notification rate limited',
          details: 'Maximum 1 email per 30 minutes per user'
        },
        { status: 429 }
      )
    }

    // Check if NotificationAPI is properly configured
    if (!process.env.NOTIFICATIONAPI_CLIENT_ID || !process.env.NOTIFICATIONAPI_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'NotificationAPI not configured' },
        { status: 500 }
      )
    }

    // Create email content
    const thresholdTypeText = thresholdType === 'upper' ? 'bovengrens' : 'ondergrens'
    const exceedsText = thresholdType === 'upper' ? 'overschreden' : 'onderschreden'
    
    // Send notification via NotificationAPI
    try {
      await notificationapi.send({
        notificationId: 'sensor_threshold_alert',
        user: {
          id: userId,
          email: userEmail,
        },
        mergeTags: {
          sensorName: sensorName || 'Onbekende sensor',
          measuremateName: measuremateName || 'Onbekende measuremate',
          currentValue: currentValue.toString(),
          thresholdValue: thresholdValue.toString(),
          thresholdTypeText,
          exceedsText,
          alertTime: new Date().toLocaleString('nl-NL'),
          dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        },
      })
    } catch (emailError) {
      console.error('NotificationAPI send error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send notification', details: emailError },
        { status: 500 }
      )
    }

    // Record notification in database
    const { error: dbError } = await supabaseService
      .from('notifications')
      .insert({
        user_id: userId,
        sensor_id: sensorId,
        notification_type: `threshold_${thresholdType}`,
        threshold_value: thresholdValue,
        sensor_value: currentValue,
      })

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Email was sent but we couldn't record it - still return success
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully'
    })

  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}