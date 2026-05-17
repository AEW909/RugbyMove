'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const emailSchema = z.string().trim().email()
const passwordSchema = z.string().min(8).max(128)

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function signIn(formData: FormData) {
  const email = emailSchema.parse(formData.get('email'))
  const password = passwordSchema.parse(formData.get('password'))
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=Invalid%20email%20or%20password')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const email = emailSchema.parse(formData.get('email'))
  const password = passwordSchema.parse(formData.get('password'))
  const confirmPassword = formData.get('confirmPassword')

  if (password !== confirmPassword) {
    redirect('/signup?error=Passwords%20do%20not%20match')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/confirm`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/signup/confirm?email=${encodeURIComponent(email)}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailSchema.parse(formData.get('email'))
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/account/password`,
  })

  if (error) {
    redirect(`/recover?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/recover?message=Password%20reset%20email%20sent')
}

export async function updatePassword(formData: FormData) {
  const password = passwordSchema.parse(formData.get('password'))
  const confirmPassword = passwordSchema.parse(formData.get('confirmPassword'))

  if (password !== confirmPassword) {
    redirect('/account/password?error=Passwords%20do%20not%20match')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/account/password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/account?message=Password%20updated')
}
