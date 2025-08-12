export interface Database {
  public: {
    Tables: {
      sensors: {
        Row: {
          id: string
          user_id: string
          name: string
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          api_key?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          api_key?: string
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
    }
  }
}

export type Sensor = Database['public']['Tables']['sensors']['Row']
export type SensorData = Database['public']['Tables']['sensor_data']['Row']
export type NewSensor = Database['public']['Tables']['sensors']['Insert']
export type NewSensorData = Database['public']['Tables']['sensor_data']['Insert']
