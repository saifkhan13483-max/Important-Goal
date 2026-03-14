/**
 * auth-error-alert.tsx — Reusable error alert for authentication pages
 *
 * Displays friendly, formatted error messages for Firebase Auth errors.
 * Maps technical Firebase error codes to user-readable strings.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AuthErrorAlertProps {
  error: Error | string | null | undefined;
}

/** Maps Firebase Auth error codes to friendly messages */
function getFriendlyMessage(error: Error | string): string {
  const msg = typeof error === "string" ? error : error.message;

  if (msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential")) {
    return "Incorrect email or password. Please try again.";
  }
  if (msg.includes("auth/email-already-in-use")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("auth/weak-password")) {
    return "Password is too weak. Use at least 6 characters.";
  }
  if (msg.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("auth/too-many-requests")) {
    return "Too many failed attempts. Please wait a moment before trying again.";
  }
  if (msg.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection and try again.";
  }
  if (msg.includes("auth/popup-closed-by-user")) {
    return "Sign-in popup was closed. Please try again.";
  }
  if (msg.includes("auth/invalid-api-key")) {
    return "App configuration error. Please contact support.";
  }

  return msg || "Something went wrong. Please try again.";
}

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" data-testid="alert-auth-error">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{getFriendlyMessage(error)}</AlertDescription>
    </Alert>
  );
}
