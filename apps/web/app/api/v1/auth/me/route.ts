import { NextResponse } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/server/api-helpers'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  return NextResponse.json(user)
}
