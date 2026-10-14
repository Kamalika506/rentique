import type { DefaultSession } from "next-auth";

type RentiqueRole = "CUSTOMER" | "BOUTIQUE_OWNER" | "ADMIN";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            role?: RentiqueRole;
        } & DefaultSession["user"];
    }

    interface User {
        role?: RentiqueRole;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: RentiqueRole;
    }
}

export { };