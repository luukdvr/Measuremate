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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          location?: string | null
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
export type Notification = Database['public']['Tables']['notifications']['Row']
export type NewMeasuremate = Database['public']['Tables']['measuremates']['Insert']
export type NewSensor = Database['public']['Tables']['sensors']['Insert']
export type NewSensorData = Database['public']['Tables']['sensor_data']['Insert']
export type NewNotification = Database['public']['Tables']['notifications']['Insert']
