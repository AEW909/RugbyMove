import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const email = process.env.SUPABASE_MASTER_EMAIL
const password = process.env.SUPABASE_MASTER_PASSWORD

if (!url || !secretKey || !email || !password) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_MASTER_EMAIL, and SUPABASE_MASTER_PASSWORD before running this script.',
  )
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

const alreadyRegistered = error?.message.toLowerCase().includes('already registered')

if (error && !alreadyRegistered) {
  throw error
}

let userId = data.user?.id

if (!userId && alreadyRegistered) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    throw listError
  }
  userId = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id
}

if (userId) {
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    username: 'awilkinson',
    team_name: 'LRGS',
    is_master: true,
  })

  if (profileError) {
    throw profileError
  }
}

console.log(`Master user ensured for ${email}`)
