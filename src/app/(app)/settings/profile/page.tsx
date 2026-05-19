import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // This shouldn't happen if trigger works, but handle it
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-accent">Error loading profile</h1>
        <p className="text-muted-foreground">Please try logging out and in again.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your public presence in Gamma.</p>
        </div>

        <ProfileForm profile={profile} />
      </div>
    </div>
  )
}
