import { Metadata } from 'next'
import ProjectsClient from './projects-client'
export const metadata: Metadata = { title: 'Projects' }
export default function ProjectsPage() { return <ProjectsClient /> }
