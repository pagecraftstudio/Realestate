import { redirect } from 'next/navigation'

// Single-company mode: registration disabled
export default function RegisterPage() {
  redirect('/login')
}
