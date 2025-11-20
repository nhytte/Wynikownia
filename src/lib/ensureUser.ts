import supabase from './supabaseClient'

export async function ensureUserExists(user: any) {
  if (!user) return false
  const userId = user.sub
  const email = user.email
  const name = user.name || null
  const givenName = user.given_name || (name ? String(name).split(' ')[0] : null)
  const familyName = user.family_name || (name && String(name).includes(' ') ? String(name).split(' ').slice(1).join(' ') : null)
  const displayName = name || user.nickname || null

  try {
    // 1. Check by ID
    const { data: existing } = await supabase.from('uzytkownicy').select('user_id').eq('user_id', userId).maybeSingle()
    if (existing) return true

    // 2. Check by Email (to detect ID mismatch)
    if (email) {
      const { data: existingByEmail } = await supabase.from('uzytkownicy').select('user_id').eq('email', email).maybeSingle()
      if (existingByEmail) {
        console.warn(`User mismatch: Auth0 ID ${userId} vs DB ID ${existingByEmail.user_id} for email ${email}. Attempting migration...`)
        
        // Attempt to update the ID in the DB to match Auth0
        // This requires ON UPDATE CASCADE on foreign keys, otherwise it will fail if user has related records.
        const { error: updateErr } = await supabase.from('uzytkownicy')
          .update({ user_id: userId })
          .eq('email', email)
        
        if (updateErr) {
          console.error('Migration failed:', updateErr)
          // If we can't update the ID, we can't proceed with the new ID.
          return false
        }
        console.info('User ID migrated successfully.')
        return true
      }
    }

    // 3. Insert new user
    const { error } = await supabase.from('uzytkownicy').insert({
      user_id: userId,
      email: email,
      nazwa_wyswietlana: displayName,
      imie: givenName,
      nazwisko: familyName,
    })
    if (error) {
      // If error is duplicate key, it means it was inserted concurrently, which is fine.
      if (error.code === '23505') return true
      console.error('ensureUserExists: insert failed', error)
      return false
    }
    return true
  } catch (e) {
    console.error('ensureUserExists: exception', e)
    return false
  }
}
