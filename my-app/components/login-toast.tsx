"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

export function LoginToast() {
  const { status } = useSession()

  useEffect(() => {
    // Wait until NextAuth fully mounts and knows the status
    if (status === "loading") return

    // Small delay ensures the generic <Toaster /> component is fully hydrated
    const timer = setTimeout(() => {
      const authState = sessionStorage.getItem("authState")

      if (status === "authenticated" && authState !== "loggedIn") {
        toast.success("Login Successful!", { position: "top-center" })
        sessionStorage.setItem("authState", "loggedIn")
      } else if (status === "unauthenticated" && authState === "loggedIn") {
        toast.success("Logout Successful!", { position: "top-center" })
        sessionStorage.setItem("authState", "loggedOut")
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [status])

  return null
}



