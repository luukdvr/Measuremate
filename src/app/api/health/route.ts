import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'IoT Dashboard API is working!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}
