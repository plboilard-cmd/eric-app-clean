import { put } from "@vercel/blob";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("projectId") as string) || "default";

    if (!file) {
      return Response.json({ error: "No file" }, { status: 400 });
    }

    const blob = await put(`projects/${projectId}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    return Response.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}