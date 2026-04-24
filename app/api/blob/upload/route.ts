import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // IMPORTANT: organise tes fichiers par projet
    const projectId = formData.get('projectId') as string || 'default';

    const blob = await put(
      `projects/${projectId}/${file.name}`,
      file,
      {
        access: 'public', // accès public pour pouvoir ouvrir le PDF facilement
      }
    );

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}