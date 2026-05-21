/**
 * TESTING AUTHENTICATION 
 * Dashboard Page — Placeholder for Phase 3 verification.
 * 
 * This is a 'use client' component because we're fetching user data
 * in the browser after the page loads (client-side data fetching).
 * 
 * In later phases you'll replace the placeholder content with real
 * interview session cards, stats charts, etc.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);   // null = still loading
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    /**
     * Fetch the current user's profile when the page loads.
     * getMe() calls our Next.js BFF route /api/auth/me which reads
     * the httpOnly cookie and forwards it to FastAPI.
     * 
     * If this fails (401), the user's cookie is invalid/expired.
     * We redirect to login — this is a second layer of protection
     * beyond the middleware check.
     */
    getMe()
      .then(setUser)
      .catch(() => {
        setError("Session expired. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      });
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();          // Calls /api/auth/logout → clears httpOnly cookies
      router.push("/login");   // Middleware will now block /dashboard access
    } catch {
      setLoggingOut(false);
      setError("Logout failed. Please try again.");
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (!user && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.name} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI Interview Coach — Dashboard
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </Button>
        </div>

        {/* Auth verification card — remove this in later phases */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 text-base">
              ✅ Phase 3 Authentication Working
            </CardTitle>
            <CardDescription className="text-green-700">
              JWT auth, httpOnly cookies, and protected routes are all verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono bg-white rounded-md p-4 border border-green-200">
              <div>
                <span className="text-gray-500">ID: </span>
                <span className="text-gray-900">{user.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="text-gray-900">{user.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Email: </span>
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Active: </span>
                <span className="text-gray-900">{user.is_active ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-gray-500">Member since: </span>
                <span className="text-gray-900">
                  {new Date(user.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future content */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-gray-400 text-base">
              🎤 Interview Sessions
            </CardTitle>
            <CardDescription>
              Your mock interview sessions will appear here in Phase 4.
            </CardDescription>
          </CardHeader>
        </Card>

      </div>
    </div>
  );
}