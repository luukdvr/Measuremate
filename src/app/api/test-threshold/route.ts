import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sensorId, value } = body
    
    // Simulate threshold check
    const threshold = 30
    const thresholdExceeded = value > threshold
    
    console.log('🔍 Threshold test:', {
      value,
      threshold,
      exceeded: thresholdExceeded
    })
    
    return NextResponse.json({
      success: true,
      thresholdTest: {
        value,
        threshold,
        exceeded: thresholdExceeded,
        message: thresholdExceeded ? 'Threshold exceeded!' : 'Within limits'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}