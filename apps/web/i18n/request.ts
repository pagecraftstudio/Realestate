import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export type Locale = 'en' | 'ar'
export const locales: Locale[] = ['en', 'ar']
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const locale = (cookieStore.get('locale')?.value as Locale) ?? defaultLocale

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  }
})
