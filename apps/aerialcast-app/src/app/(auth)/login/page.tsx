import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <AuthLayout
      title="Aerial Cast"
      subtitle="Drone Monitoring & Control Platform"
      alternateLink={{
        href: "/register",
        text: "Create account",
        question: "Don't have an account?",
      }}
    >
      <LoginForm />
    </AuthLayout>
  )
}
