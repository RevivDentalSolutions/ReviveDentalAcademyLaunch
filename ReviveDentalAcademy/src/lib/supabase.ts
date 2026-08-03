import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// ============================================================
// Type Definitions
// ============================================================

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member' | 'student'
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  image_url: string | null
  price: number
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order: number
  created_at: string
  updated_at: string
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  duration: string | null
  order: number
  created_at: string
  updated_at: string
}

export interface VideoPackageScene {
  title: string
  duration: string
  narration: string
  visualDescription: string
  stockKeywords: string[]
  onScreenText: string
  canvaPrompt: string
}

export interface VideoPackageData {
  thumbnailPrompt: string
  brandStyle: string
  scenes: VideoPackageScene[]
}

export interface VideoPackage {
  id: string
  lesson_id: string
  package: VideoPackageData
  created_at: string
}

export interface Template {
  id: string
  title: string
  description: string | null
  category: 'verification' | 'scheduling' | 'billing' | 'forms' | 'other'
  file_url: string
  is_premium: boolean
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  lesson_id: string
  completed_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan_type: 'monthly' | 'annual'
  status: 'incomplete' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  course_id: string
  stripe_payment_intent_id: string | null
  amount: number
  status: 'pending' | 'completed' | 'refunded'
  created_at: string
}

// ============================================================
// Auth Helpers
// ============================================================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordRecovery(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data
}

// ============================================================
// Course API
// ============================================================

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getCourseWithContent(courseId: string): Promise<{
  course: Course | null
  modules: Module[]
}> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (courseError) throw courseError

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (modulesError) throw modulesError

  return {
    course,
    modules: (modules || []).map(m => ({
      ...m,
      lessons: (m.lessons || []).sort((a: Lesson, b: Lesson) => a.order - b.order),
    })),
  }
}

// ============================================================
// Template API
// ============================================================

export async function getTemplates(category?: string): Promise<Template[]> {
  let query = supabase.from('templates').select('*')

  if (category && category !== 'All') {
    query = query.eq('category', category.toLowerCase().replace(/\s+/g, '_'))
  }

  const { data, error } = await query.order('title', { ascending: true })

  if (error) throw error
  return data || []
}

// ============================================================
// Progress API
// ============================================================

export async function completeLesson(lessonId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id, lesson_id' })

  if (error) throw error
}

export async function getUserProgress(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_progress')
    .select('lesson_id')
    .eq('user_id', user.id)

  if (error) throw error
  return data?.map(p => p.lesson_id) || []
}

// ============================================================
// Subscription / Access API
// ============================================================

export async function hasActiveSubscription(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .limit(1)

  if (error) return false
  return (data?.length || 0) > 0
}

export async function hasPurchasedCourse(courseId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'completed')
    .single()

  if (error) return false
  return !!data
}
