// Login Page UI
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

// shadcn/ui components — pre-built, accessible UI primitives
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  // Single state object for form fields — easier to manage than separate states
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");       // Error message to display
  const [loading, setLoading] = useState(false); // Disable button while request in flight

  // Generic change handler — works for any input with a `name` attribute
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    // IMPORTANT: Prevent default form submission which would reload the page
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      // login() sets httpOnly cookies via Next.js BFF
      // Now redirect to dashboard — middleware will allow this since cookie is set
      router.push("/dashboard");
    } catch (err) {
      // Display the error message from FastAPI (e.g. "Invalid email or password")
      setError(err.message || "Login failed. Please try again.");
    } finally {
      // Always re-enable the button, even if there was an error
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your AI Interview Coach account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* We use a real <form> element for accessibility and Enter-to-submit */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error banner — only shown when error is non-empty */}
            {error && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-md"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"      // Must match the key in formData state
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"   // Must match the key in formData state
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}