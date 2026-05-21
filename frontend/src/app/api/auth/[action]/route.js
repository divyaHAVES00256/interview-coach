// Next.js Backend-for-Frontend (BFF) Auth Proxy
// Dynamic Route [action] -> src/app/api/auth/[action]/route.js
import { NextResponse } from "next/server";

const FASTAPI_URL = "http://localhost:8000/api/v1";

// POST handler -> covers : login, register, logout, refresh
export async function POST(request, { params }) {
    //1 User submits action form 
  const { action } = params; 

  //2 Next.js parse request body
  const body = await request.json().catch(() => ({}));

  //3 Next.js forwards request to FastAPI
  const backendRes = await fetch(`${FASTAPI_URL}/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errorData = await backendRes.json().catch(() => ({
      detail: "Authentication server error",
    }));
    return NextResponse.json(errorData, { status: backendRes.status });
  }

  const data = await backendRes.json();

  //4 Next.js sets cookies
  // ── Handle Login & Register ──────────────────────────────────────────────
  if (action === "login" || action === "register") {
    const response = NextResponse.json(
      { user: data.user },
      { status: action === "register" ? 201 : 200 }
    );
    
    // access token cookie (30 min)
    response.cookies.set("access_token", data.access_token, {
      httpOnly: true,                                      
      secure: process.env.NODE_ENV === "production",       
      sameSite: "lax",                                     
      maxAge: 60 * 30,                                     
      path: "/",                                           
    });

    // refresh token cookie (7 days)
    response.cookies.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,                           
      path: "/api/auth/refresh",                           
    });

    return response;
  }

  // ── Handle Logout ────────────────────────────────────────────────────────
  if (action === "logout") {
    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  // ── Handle Token Refresh ─────────────────────────────────────────────────
  if (action === "refresh") {
    const response = NextResponse.json({ user: data.user });
    response.cookies.set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 30,
      path: "/",
    });
    response.cookies.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/api/auth/refresh",
    });
    return response;
  }

  // Catch-all for unknown actions
  return NextResponse.json({ detail: "Unknown auth action" }, { status: 404 });
}


// GET handler —> covers: me
export async function GET(request, { params }) {
  const { action } = params;

  if (action === "me") {
    // read the httpOnly cookie from the incoming request
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    // forward to FastAPI with token in Authorization header
    const backendRes = await fetch(`${FASTAPI_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  }

  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}