import { NextRequest, NextResponse } from "next/server";

type IncomingAttachment = {
  label: string;
  name: string;
  pathname?: string;
  url?: string;
};

type SendPlanRequest = {
  to: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  projectNumber: string;
  planCode: string;
  attachments: IncomingAttachment[];
};

function sanitizeEmail(value: string) {
  return value.trim();
}

function makeHtmlBody(text: string) {
  return text
    .split("\n")
    .map((line) =>
      line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    )
    .join("<br />");
}

async function downloadAttachment(
  request: NextRequest,
  attachment: IncomingAttachment,
) {
  const origin = new URL(request.url).origin;

  const sourceUrl = attachment.pathname
    ? `${origin}/api/blob/download?pathname=${encodeURIComponent(attachment.pathname)}`
    : attachment.url;

  if (!sourceUrl) {
    throw new Error(`Le fichier ${attachment.name} n'a pas d'adresse valide.`);
  }

  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le fichier ${attachment.name}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const content = Buffer.from(arrayBuffer).toString("base64");

  return {
    filename: attachment.name || `${attachment.label}.pdf`,
    content,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY est manquant dans les variables d'environnement.",
        },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as Partial<SendPlanRequest>;

    const to = sanitizeEmail(payload.to ?? "");
    const subject = (payload.subject ?? "").trim();
    const body = payload.body ?? "";
    const senderName = (payload.senderName ?? "ERIC").trim();
    const senderEmail = sanitizeEmail(payload.senderEmail ?? "");
    const attachments = payload.attachments ?? [];

    if (!to || !subject || !body || !senderEmail) {
      return NextResponse.json(
        { error: "Destinataire, sujet, message ou expéditeur manquant." },
        { status: 400 },
      );
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: "Aucune pièce jointe PDF n'a été fournie." },
        { status: 400 },
      );
    }

    const resolvedAttachments = await Promise.all(
      attachments.map((attachment) => downloadAttachment(request, attachment)),
    );

    // Important: la plupart des fournisseurs n'acceptent que des adresses From vérifiées.
    // EMAIL_FROM_OVERRIDE permet d'utiliser une adresse vérifiée comme notifications@dynamiqueexpert.ca
    // tout en gardant le bon Reply-To selon l'utilisateur connecté.
    const fromAddress = process.env.EMAIL_FROM_OVERRIDE || senderEmail;

    const resendPayload = {
      from: `${senderName} <${fromAddress}>`,
      to: [to],
      reply_to: senderEmail,
      subject,
      text: body,
      html: makeHtmlBody(body),
      attachments: resolvedAttachments,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendResult = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          error:
            resendResult?.message ??
            resendResult?.error ??
            "Le fournisseur courriel a refusé l'envoi.",
        },
        { status: resendResponse.status },
      );
    }

    return NextResponse.json({ ok: true, result: resendResult });
  } catch (error) {
    console.error("SEND PLAN EMAIL ERROR", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant l'envoi du courriel.",
      },
      { status: 500 },
    );
  }
}
