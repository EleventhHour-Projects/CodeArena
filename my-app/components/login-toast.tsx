"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function LoginToast({ isLoggedIn }: { isLoggedIn: boolean }) {
  useEffect(() => {
    if (isLoggedIn) {
      const hasShownToast = sessionStorage.getItem("loginToastShown")
      if (!hasShownToast) {
        toast.success("Login Successful!", {
          position: "top-center"
        })
        sessionStorage.setItem("loginToastShown", "true")
      }
    }
  }, [isLoggedIn])

  return null
}



