'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { SensorData } from '@/types/database'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface SensorChartProps {
  data: SensorData[]
}

export default function SensorChart({ data }: SensorChartProps) {
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)

  // Sort data by timestamp and reverse to show oldest first
  const sortedData = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Nog geen data beschikbaar
      </div>
    )
  }

  const chartData = {
    labels: sortedData.map(item => 
      format(new Date(item.timestamp), 'HH:mm', { locale: nl })
    ),
    datasets: [
      {
        label: 'Waarde',
        data: sortedData.map(item => item.value),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex
            const timestamp = sortedData[index].timestamp
            return format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: nl })
          },
          label: function(context: any) {
            return `Waarde: ${context.parsed.y.toFixed(2)}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tijd',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Waarde',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  )
}
