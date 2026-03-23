import MeasuremateDetail from '@/components/dashboard/MeasuremateDetail'

interface MeasurematePageProps {
  params: Promise<{ id: string }>
}

export default async function MeasurematePage({ params }: MeasurematePageProps) {
  const { id } = await params
  return <MeasuremateDetail measuremateId={id} />
}
