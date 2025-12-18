import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthBranding } from "./auth-branding";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

export function AuthForm() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="min-h-screen flex">
      <AuthBranding />
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">
                Please enter your details to continue
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
                <TabsTrigger
                  value="login"
                  className="text-base data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="text-base data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm onSwitchTab={() => setActiveTab("login")} />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm onSwitchTab={() => setActiveTab("register")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
