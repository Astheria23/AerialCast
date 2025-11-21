import { AuthLayout } from "@/components/auth/auth-layout"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Aerial Cast"
      subtitle="Drone Monitoring & Control Platform"
      alternateLink={{
        href: "/login",
        text: "Sign in",
        question: "Already have an account?",
      }}
    >
      <RegisterForm />
    </AuthLayout>
  )
}
