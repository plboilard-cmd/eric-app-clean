import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const blob = await get(url);

    return NextResponse.redirect(blob.url);
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}