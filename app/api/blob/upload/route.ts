import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
    }

    const blob = await put(`plans/${file.name}`, file, {
      access: 'public',
    });

    return Response.json({ url: blob.url });

  } catch (error) {
    console.error('UPLOAD ERROR:', error);

    return new Response(
      JSON.stringify({ error: 'Upload failed' }),
      { status: 500 }
    );
  }
}