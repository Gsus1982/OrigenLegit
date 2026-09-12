// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { barcode, correct } = await req.json();
  if (!barcode || typeof correct !== "boolean") {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }
  const pool = getPool();
  await pool.query(`insert into feedback (barcode, correct) values ($1, $2)`, [barcode, correct]);
  return NextResponse.json({ ok: true });
}
