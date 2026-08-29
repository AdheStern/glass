// Glass — Better Auth: sesión del panel + OAuth 2.1 / discovery para clientes MCP.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
