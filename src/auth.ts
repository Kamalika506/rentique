import NextAuth from "next-auth";
// import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),

    // Credentials authentication requires JWT sessions.
    session: {
        strategy: "jwt",
    },

    providers: [

        Credentials({
            name: "Email and Password",

            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials) {
                const parsed = z
                    .object({
                        email: z.string().email().max(254),
                        password: z.string().min(1).max(128),
                    })
                    .safeParse(credentials);

                if (!parsed.success) return null;

                const email = parsed.data.email.trim().toLowerCase();

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.passwordHash || !user.isActive) {
                    return null;
                }

                const validPassword = await compare(
                    parsed.data.password,
                    user.passwordHash
                );

                if (!validPassword) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user?.id) {
                token.sub = user.id;
            }

            if (token.sub) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { role: true, isActive: true },
                });

                if (!dbUser?.isActive) {
                    return null;
                }

                token.role = dbUser.role;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;

                const role = token.role;

                if (
                    role === "CUSTOMER" ||
                    role === "BOUTIQUE_OWNER" ||
                    role === "ADMIN"
                ) {
                    session.user.role = role;
                }
            }

            return session;
        },
    },
});