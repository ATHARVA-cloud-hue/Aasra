import { connection } from "next/server";
import { getServiceStatus } from "@/lib/env";

/*
  GET /api/status
  Tells the browser which services are switched on (true/false only).
  Used by the demo-mode banner. Never returns the keys themselves.
*/
export async function GET() {
  // Read env variables at request time, not at build time,
  // so adding keys on Vercel takes effect without code changes.
  await connection();
  return Response.json(getServiceStatus());
}
