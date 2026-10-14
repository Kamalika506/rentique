import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid registration details." },
                { status: 400 }
            );
        }

        const name = parsed.data.name;
        const email = parsed.data.email.toLowerCase();
        const passwordHash = await hash(parsed.data.password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: "CUSTOMER",
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            { message: "Registration successful.", user },
            { status: 201 }
        );
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }

        console.error("Registration failed:", error);

        return NextResponse.json(
            { error: "Unable to register right now." },
            { status: 500 }
        );
    }
}