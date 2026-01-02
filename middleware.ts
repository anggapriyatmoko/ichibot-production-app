export { default } from "next-auth/middleware"

export const config = { matcher: ["/inventory/:path*", "/checkout/:path*"] }
