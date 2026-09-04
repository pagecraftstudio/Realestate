import { Metadata } from 'next'
import ProjectDetailClient from './project-detail-client'
export const metadata: Metadata = { title: 'Project' }
export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient id={params.id} />
}
