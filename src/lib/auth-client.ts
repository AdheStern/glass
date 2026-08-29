"use client";
// Glass — cliente de Better Auth para el navegador (panel).
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession, changePassword } = authClient;
