export interface Database {
  public: {
    Tables: {
      measuremates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          location: string | null
          latitude: number | null
          longitude: number | null
          last_data_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          last_data_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          last_data_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sensors: {
        Row: {
          id: string
          user_id: string
          measuremate_id: string
          name: string
          api_key: string
          scale: number | null
          scaleMin: number | null
          tijdScale: string | null
          alert_threshold: number | null
          alert_lower_threshold: number | null
          unit: string
          sensor_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          measuremate_id: string
          name: string
          api_key?: string
          scale?: number | null
          scaleMin?: number | null
          tijdScale?: string | null
          alert_threshold?: number | null
          alert_lower_threshold?: number | null
          unit?: string
          sensor_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          measuremate_id?: string
          name?: string
          api_key?: string
          scale?: number | null
          scaleMin?: number | null
          tijdScale?: string | null
          alert_threshold?: number | null
          alert_lower_threshold?: number | null
          unit?: string
          sensor_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      sensor_data: {
        Row: {
          id: string
          sensor_id: string
          user_id: string
          timestamp: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          sensor_id: string
          user_id: string
          timestamp?: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          sensor_id?: string
          user_id?: string
          timestamp?: string
          value?: number
          created_at?: string
        }
      }
      manual_measurements: {
        Row: {
          id: string
          sensor_id: string
          user_id: string
          value: number
          timestamp: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sensor_id: string
          user_id: string
          value: number
          timestamp?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sensor_id?: string
          user_id?: string
          value?: number
          timestamp?: string
          notes?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          sensor_id: string
          notification_type: string
          email_sent_at: string
          threshold_value: number
          sensor_value: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sensor_id: string
          notification_type: string
          email_sent_at?: string
          threshold_value: number
          sensor_value: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sensor_id?: string
          notification_type?: string
          email_sent_at?: string
          threshold_value?: number
          sensor_value?: number
          created_at?: string
        }
      }
    }
  }
}

export type Measuremate = Database['public']['Tables']['measuremates']['Row']
export type Sensor = Database['public']['Tables']['sensors']['Row']
export type SensorData = Database['public']['Tables']['sensor_data']['Row']
export type ManualMeasurement = Database['public']['Tables']['manual_measurements']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type NewMeasuremate = Database['public']['Tables']['measuremates']['Insert']
export type NewSensor = Database['public']['Tables']['sensors']['Insert']
export type NewSensorData = Database['public']['Tables']['sensor_data']['Insert']
export type NewManualMeasurement = Database['public']['Tables']['manual_measurements']['Insert']
export type NewNotification = Database['public']['Tables']['notifications']['Insert']

// Node status type
export type NodeStatus = 'online' | 'warning' | 'offline' | 'unknown'

export function getNodeStatus(lastDataReceivedAt: string | null, intervalMinutes: number = 15): NodeStatus {
  if (!lastDataReceivedAt) return 'unknown'
  
  const lastReceived = new Date(lastDataReceivedAt).getTime()
  const now = Date.now()
  const diffMs = now - lastReceived
  const intervalMs = intervalMinutes * 60 * 1000

  if (diffMs < 2 * intervalMs) return 'online'
  if (diffMs < 5 * intervalMs) return 'warning'
  return 'offline'
}

export const statusConfig: Record<NodeStatus, { label: string; color: string; dotColor: string; bgColor: string }> = {
  online: { label: 'Online', color: 'text-green-600', dotColor: 'bg-green-500', bgColor: 'bg-green-50' },
  warning: { label: 'Waarschuwing', color: 'text-amber-600', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50' },
  offline: { label: 'Offline', color: 'text-red-600', dotColor: 'bg-red-500', bgColor: 'bg-red-50' },
  unknown: { label: 'Onbekend', color: 'text-gray-400', dotColor: 'bg-gray-400', bgColor: 'bg-gray-50' },
}
