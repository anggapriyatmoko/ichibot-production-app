import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const isAuth = !!token
        const isRootPage = req.nextUrl.pathname === "/"

        // If authenticated and on root page, redirect to dashboard
        if (isRootPage && isAuth) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => {
                return !!token
            },
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - uploads (public uploads)
         * - login (login page)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|uploads|login).*)',
    ],
}
