import { withAuth } from "next-auth/middleware";

// Default export protects all routes that match the config matcher
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protects the root app and api routes except the auth api and github public
  // We specify what routes we want to protect. Let's protect the home route.
  matcher: ["/"],
};
