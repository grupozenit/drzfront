"use client"

import { SignIn } from "@clerk/nextjs"
import Image from "next/image"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative w-[190px] h-[70px]">
            <Image
              src="/logo/zenit-logo-horizontal.png"
              alt="Grupo Zenit"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex justify-center">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-border",
              }
            }}
            fallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ¿Necesitas una cuenta? Contacta al administrador para obtener acceso.
        </p>
      </div>
    </div>
  )
}

