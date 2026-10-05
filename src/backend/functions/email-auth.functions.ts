// dans src/backend/functions/email-auth.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { dateFr } from '@/components/app/AdminKit'

async function admin() {
  const { supabaseAdmin } =
    await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function smtp() {
  return import('@/backend/email/smtp.server')
}

function origine() {
  const req = getRequest()
  return new URL(req.url).origin
}
const code6 = () =>
  String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(
    6,
    '0',
  )
const jetonAleatoire = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

async function utilisateurParEmail(email: string) {
  const db = await admin()
  const { data } = await db
    .from('utilisateur')
    .select('utilisateur_id, auth_user_id, nom, prenoms, email, email_verifie')
    .ilike('email', email)
    .maybeSingle()
  return data
}

async function envoyerCode(u: {
  utilisateur_id: number
  email: string
  prenoms: string
}) {
  const db = await admin()
  await db
    .from('jeton_creation_compte')
    .update({ revoque_le: new Date().toISOString() })
    .eq('utilisateur_id', u.utilisateur_id)
    .is('verifie_le', null)
    .is('revoque_le', null)
  const code = code6()
  const { error } = await db.from('jeton_creation_compte').insert({
    utilisateur_id: u.utilisateur_id,
    jeton: code,
    expire_le: new Date(Date.now() + 30 * 60_000).toISOString(),
  })
  if (error) throw new Error('Impossible de générer le code.')
  const { envoyerEmail, gabarit } = await smtp()
  await envoyerEmail({
    a: u.email,
    sujet: `Votre code de vérification : ${code}`,
    texte: `Bonjour ${u.prenoms}, votre code de vérification est ${code}. elle expire dans 30 minutes.`,
    html: gabarit(
      'Vérifiez votre adresse e-mail',
      `Bonjour, voici votre code de vérification :<div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#FF7900;margin:20px 0">${code}</div>Il expire dans 30 minutes et ne peut être utilisé qu'une seule fois.`,
    ),
  })
}

export const creerCompte = createServerFn({ method: 'POST' })
  .validator((d) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        motDePasse: z.string().min(8).max(72),
        nom: z.string().trim().min(1).max(100),
        prenoms: z.string().trim().min(1).max(100),
        telephone: z.string().trim().max(15),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin()
    const existant = await utilisateurParEmail(data.email)
    if (existant?.email_verifie)
      return {
        ok: false as const,
        erreur: 'Un compte existe déjà avec cette adresse e-mail.',
      }
    if (!existant) {
      const { error } = await db.auth.admin.createUser({
        email: data.email,
        password: data.motDePasse,
        email_confirm: false,
        user_metadata: {
          nom: data.nom,
          prenoms: data.prenoms,
          telephone: data.telephone,
        },
      })
      if (error)
        return { ok: false as const, erreur: 'La création du compte a échoué.' }
    }
    const u = await utilisateurParEmail(data.email)
    if (!u) return { ok: false as const, erreur: 'Profil introuvable.' }
    try {
      await envoyerCode(u)
    } catch (e) {
      console.error('envoi code', e)
      return {
        ok: false as const,
        erreur: "Compte créé, mais l'e-mail n'a pas pu être envoyé.",
      }
    }
    return { ok: true as const }
  })

export const renvoyerCode = createServerFn({ method: 'POST' })
  .validator((d) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }) => {
    const u = await utilisateurParEmail(data.email)
    if (u && !u.email_verifie) {
      try {
        await envoyerCode(u)
      } catch (e) {
        console.error(e)
        return { ok: false }
      }
    }
    return { ok: true }
  })

export const verifierCode = createServerFn({ method: 'POST' })
  .validator((d) =>
    z
      .object({
        email: z.string().trim().email(),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin()
    const u = await utilisateurParEmail(data.email)
    if (!u) return { ok: false }
    const { data: j } = await db
      .from('jeton_creation_compte')
      .select('jeton_creation_compte_id, expire_le')
      .eq('utilisateur_id', u.utilisateur_id)
      .eq('jeton', data.code)
      .is('verifie_le', null)
      .is('revoque_le', null)
      .maybeSingle()
    if (!j || new Date(j.expire_le) < new Date()) return { ok: false }
    const maintenant = new Date().toISOString()
    await db
      .from('jeton_creation_compte')
      .update({ verifie_le: maintenant, revoque_le: maintenant })
      .eq('jeton_creation_compte_id', j.jeton_creation_compte_id)
    await db.auth.admin.updateUserById(u.auth_user_id, { email_confirm: true })
    await db
      .from('utilisateur')
      .update({ email_verifie: true })
      .eq('utilisateur_id', u.utilisateur_id)
    return { ok: true }
  })

export const demanderReinitialisation = createServerFn({ method: 'POST' })
  .validator((d) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin()
    const u = await utilisateurParEmail(data.email)
    if (!u) return { ok: true } // ne révèle pas l'existence du compte
    await db
      .from('jeton_mot_de_passe_oublie')
      .update({ revoque_le: new Date().toISOString() })
      .eq('utilisateur_id', u.utilisateur_id)
      .is('utilise_le', null)
      .is('revoque_le', null)
    const jeton = jetonAleatoire()
    await db.from('jeton_mot_de_passe_oublie').insert({
      utilisateur_id: u.utilisateur_id,
      jeton,
      expire_le: new Date(Date.now() + 60 * 60_000).toISOString(),
    })
    const lien = `${origine()}/auth/nouveau-mot-de-passe?jeton=${jeton}`
    const { envoyerEmail, gabarit } = await smtp()
    try {
      await envoyerEmail({
        a: u.email,
        sujet: 'Réinitialisation de votre mot de passe',
        texte: `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure, usage unique) : ${lien}`,
        html: gabarit(
          'Réinitialiser votre mot de passe',
          "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable 1 heure et ne peut servir qu'une fois.",
          { texte: 'Changer mon mot de passe', url: lien },
        ),
      })
    } catch (e) {
      console.error('[réinitialisation] Erreur envoi email:', e)
      return { ok: true }
    }
    return { ok: true }
  })

export const reinitialiserMotDePasse = createServerFn({ method: 'POST' })
  .validator((d) =>
    z
      .object({
        jeton: z.string().regex(/^[a-f0-9]{64}$/),
        motDePasse: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin()
    const { data: j } = await db
      .from('jeton_mot_de_passe_oublie')
      .select(
        'jeton_mot_de_passe_oublie_id, expire_le, utilisateur:utilisateur(auth_user_id)',
      )
      .eq('jeton', data.jeton)
      .is('utilise_le', null)
      .is('revoque_le', null)
      .maybeSingle()
    const authId = (j?.utilisateur as { auth_user_id: string } | null)
      ?.auth_user_id
    if (!j || !authId || new Date(j.expire_le) < new Date())
      return { ok: false }
    const { error } = await db.auth.admin.updateUserById(authId, {
      password: data.motDePasse,
    })
    if (error) return { ok: false }
    await db
      .from('jeton_mot_de_passe_oublie')
      .update({ utilise_le: new Date().toISOString() })
      .eq('jeton_mot_de_passe_oublie_id', j.jeton_mot_de_passe_oublie_id)
    return { ok: true }
  })

export const emailInscriptionAcceptee = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ inscriptionId: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    // lecture via RLS de l'appelant : seul un gestionnaire voit l'inscription
    const { data: i } = await context.supabase
      .from('inscription')
      .select(
        'statut, participant:participant(utilisateur:utilisateur(email, nom, prenoms)),date_inscription, session:session_formation(nom_session, date_debut, date_fin, formation:formation(titre))',
      )
      .eq('inscription_id', data.inscriptionId)
      .maybeSingle()
    if (!i || i.statut !== 'Acceptée') return { ok: false }
    const p = i.participant as unknown as {
      utilisateur: { email: string; nom: string; prenoms: string }
    } | null
    const s = i.session as unknown as {
      nom_session: string
      date_debut: string
      date_fin: string
      formation: { titre: string } | null
    } | null
    if (!p?.utilisateur?.email || !s) return { ok: false }
    const { envoyerEmail, gabarit, echap } = await smtp()
    const titre = s.formation?.titre ?? s.nom_session
    try {
      await envoyerEmail({
        a: p.utilisateur.email,
        sujet: `Inscription ${titre} confirmée :`,
        texte: `Bonjour ${p.utilisateur.nom} ${p.utilisateur.prenoms}, votre inscription à « ${titre} », du ${dateFr(s.date_debut)} au ${dateFr(s.date_fin)} est confirmée.`,
        html: gabarit(
          `Votre inscription à la formation ${echap(titre)} est confirmée`,
          `Bonjour ${echap(p.utilisateur.nom)} ${echap(p.utilisateur.prenoms)},<br/>
           Vous êtes inscrit(e) à la formation <b style="color:#FF7900 !important">${echap(titre)}</b> du ${echap(dateFr(i.date_inscription))}.<br/>
           Votre inscription à cette formation, du <b style="color:#FF7900 !important">${echap(dateFr(s.date_debut))}</b> au <b style="color:#FF7900 !important">${echap(dateFr(s.date_fin))}</b>, a été acceptée.<br/>`,
          {
            texte: 'Voir mes inscriptions',
            url: `${origine()}/catalogue`,
          },
        ),
      })
    } catch (e) {
      console.error(e)
      return { ok: false }
    }
    return { ok: true }
  })
