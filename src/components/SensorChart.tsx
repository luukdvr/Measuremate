'use client'

import { useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface ChartPoint { timestamp: string; value: number | null }

interface SensorChartProps {
  data: ChartPoint[]
  yMax?: number
  yMin?: number
  xFormat?: string
  thresholdUpper?: number
  thresholdLower?: number
}

export default function SensorChart({ data, yMax, yMin, xFormat = 'HH:mm:ss', thresholdUpper, thresholdLower }: SensorChartProps) {
  const chartRef = useRef<ChartJS<'line', (number | null)[], string>>(null)

  // Sort data by timestamp ascending
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
      format(new Date(item.timestamp), xFormat, { locale: nl })
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
        pointRadius: 0,
        pointHoverRadius: 0,
  spanGaps: true,
      },
      ...(typeof thresholdUpper === 'number' ? [{
        label: 'Bovengrens',
        data: new Array(sortedData.length).fill(thresholdUpper),
        borderColor: 'rgba(220, 38, 38, 1)', // red-600
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
        borderDash: [6, 4],
      }] : []),
      ...(typeof thresholdLower === 'number' ? [{
        label: 'Ondergrens',
        data: new Array(sortedData.length).fill(thresholdLower),
        borderColor: 'rgba(249, 115, 22, 1)', // orange-500
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
        borderDash: [4, 4],
      }] : []),
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 0,
        hoverRadius: 0,
        hitRadius: 8,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            const index = context[0].dataIndex
            const timestamp = sortedData[index].timestamp
            return format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: nl })
          },
          label: function(context: TooltipItem<'line'>) {
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
  min: typeof yMin === 'number' ? yMin : undefined,
        max: typeof yMax === 'number' ? yMax : undefined,
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
