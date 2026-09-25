import nodemailer from "nodemailer";
type Mail = { a: string; sujet: string; html: string; texte: string };


export async function envoyerEmail({ a, sujet, html, texte }: Mail): Promise<void> {
  const user = process.env["GMAIL_SMTP_USER"];
  const pass = process.env["GMAIL_SMTP_APP_PASSWORD"]?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("Configuration Gmail SMTP manquante");
  if (/[\r\n]/.test(a) || /[\r\n]/.test(sujet)) throw new Error("En-tête invalide");

  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user,
    pass,
  },
});

await transporter.sendMail({
  from: `"Plateforme de formation" <${user}>`,
  to: a,
  subject: sujet,
  text: texte,
  html,
});
}

const echap = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function gabarit(titre: string, contenu: string, bouton?: { texte: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Roboto,Arial,sans-serif;color:#000">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<div style="width:48px;height:48px;background:#FF7900"></div>
<h1 style="font-size:22px;margin:24px 0 12px">${echap(titre)}</h1>
<div style="font-size:15px;line-height:1.6;color:#5F6368">${contenu}</div>
${bouton ? `<p style="margin:28px 0"><a href="${echap(bouton.url)}" style="background:#FF7900;color:#fff;text-decoration:none;padding:12px 24px;border-radius:2px;font-weight:bold">${echap(bouton.texte)}</a></p>` : ""}
<p style="font-size:12px;color:#5F6368;margin-top:32px">Orange Digital Center — Plateforme de formation</p>
</div></body></html>`;
}
export { echap };
