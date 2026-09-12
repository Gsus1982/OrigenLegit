// app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { buildEvidence } from "@/lib/originEngine";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CF_API_TOKEN!;
const CF_OCR_MODEL = "@cf/microsoft/resnet-50";

async function runOCR(imageBuffer: ArrayBuffer): Promise<string> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return "";
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_OCR_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    body: imageBuffer,
  });
  const json = await res.json();
  return json?.result?.text ?? "";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const barcode = formData.get("barcode") as string | null;

  if (!file) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const extractedText = await runOCR(buffer);
  const evidence = buildEvidence("ocr", extractedText);

  const verdict = evidence.countryCode === "MA" ? "red" : evidence.countryCode === "EH" ? "orange" : evidence.countryCode === "ES" ? "green" : "unknown";

  const pool = getPool();
  await pool.query(`insert into scans (barcode, final_verdict) values ($1, $2)`, [barcode, verdict]);

  return NextResponse.json({ extractedText, evidence });
}
