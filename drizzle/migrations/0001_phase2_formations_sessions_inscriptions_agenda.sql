CREATE TYPE public.niveau_formation_enum AS ENUM ('Débutant', 'Intermédiaire', 'Avancé');
CREATE TYPE public.statut_formation_enum AS ENUM ('Brouillon', 'Publiée', 'Archivée');
CREATE TYPE public.statut_session_enum AS ENUM ('Planifiée', 'En cours', 'Terminée', 'Annulée');
CREATE TYPE public.statut_inscription_enum AS ENUM ('En attente', 'Acceptée', 'Refusée', 'Liste d''attente', 'Annulée');
CREATE TYPE public.type_evenement_enum AS ENUM ('Réunion', 'Atelier', 'Conférence', 'Cérémonie', 'Autre');
CREATE TYPE public.statut_evenement_enum AS ENUM ('Brouillon', 'Planifié', 'En cours', 'Terminé', 'Annulé');
CREATE TYPE public.type_media_enum AS ENUM ('Image', 'Vidéo', 'Document');

CREATE TABLE public.categorie_formation (
  categorie_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR NOT NULL UNIQUE,
  icone VARCHAR,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categorie_formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorie_formation TO authenticated;
GRANT ALL ON public.categorie_formation TO service_role;
ALTER TABLE public.categorie_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories lecture" ON public.categorie_formation FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "categories gestion" ON public.categorie_formation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE public.formation (
  formation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categorie_id BIGINT REFERENCES public.categorie_formation(categorie_id) ON DELETE SET NULL,
  titre VARCHAR NOT NULL,
  description TEXT,
  niveau niveau_formation_enum NOT NULL DEFAULT 'Débutant',
  url_image VARCHAR,
  statut statut_formation_enum NOT NULL DEFAULT 'Brouillon',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation TO authenticated;
GRANT ALL ON public.formation TO service_role;
ALTER TABLE public.formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "formations lecture" ON public.formation FOR SELECT TO authenticated USING (true);
CREATE POLICY "formations publiees anon" ON public.formation FOR SELECT TO anon USING (statut = 'Publiée');
CREATE POLICY "formations gestion" ON public.formation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE public.session_formation (
  session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formation_id BIGINT NOT NULL REFERENCES public.formation(formation_id) ON DELETE CASCADE,
  formateur_id BIGINT REFERENCES public.formateur(formateur_id) ON DELETE SET NULL,
  nom_session VARCHAR NOT NULL,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  lieu VARCHAR,
  capacite INTEGER,
  statut statut_session_enum NOT NULL DEFAULT 'Planifiée',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.session_formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_formation TO authenticated;
GRANT ALL ON public.session_formation TO service_role;
ALTER TABLE public.session_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions lecture" ON public.session_formation FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sessions gestion" ON public.session_formation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE public.inscription (
  inscription_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.session_formation(session_id) ON DELETE CASCADE,
  participant_id BIGINT NOT NULL REFERENCES public.participant(participant_id) ON DELETE CASCADE,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut statut_inscription_enum NOT NULL DEFAULT 'En attente',
  motivation TEXT,
  engagement BOOLEAN NOT NULL DEFAULT false,
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, participant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscription TO authenticated;
GRANT ALL ON public.inscription TO service_role;
ALTER TABLE public.inscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscription lecture" ON public.inscription FOR SELECT TO authenticated USING (
  participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id())
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE') OR public.a_role(auth.uid(), 'FORMATEUR')
);
CREATE POLICY "inscription creation" ON public.inscription FOR INSERT TO authenticated WITH CHECK (
  participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id())
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
);
CREATE POLICY "inscription maj" ON public.inscription FOR UPDATE TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));
CREATE POLICY "inscription suppression" ON public.inscription FOR DELETE TO authenticated USING (
  participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id())
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
);

CREATE TABLE public.presence (
  presence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id BIGINT NOT NULL REFERENCES public.inscription(inscription_id) ON DELETE CASCADE,
  date_presence DATE NOT NULL DEFAULT CURRENT_DATE,
  present BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (inscription_id, date_presence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presence TO authenticated;
GRANT ALL ON public.presence TO service_role;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence lecture" ON public.presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence gestion" ON public.presence FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE') OR public.a_role(auth.uid(), 'FORMATEUR'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE') OR public.a_role(auth.uid(), 'FORMATEUR'));



CREATE TABLE public.attestation (
  attestation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id BIGINT NOT NULL UNIQUE REFERENCES public.inscription(inscription_id) ON DELETE CASCADE,
  numero_attestation VARCHAR(30) NOT NULL UNIQUE,
  jeton_verification VARCHAR(255) NOT NULL UNIQUE,
  statut public.statut_attestation_enum NOT NULL DEFAULT 'Valide',
  delivree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attestation TO authenticated;
GRANT ALL ON public.attestation TO service_role;
ALTER TABLE public.attestation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attestation lecture" ON public.attestation FOR SELECT TO authenticated USING (
  inscription_id IN (
    SELECT i.inscription_id FROM public.inscription i
    JOIN public.participant p ON p.participant_id = i.participant_id
    WHERE p.utilisateur_id = public.utilisateur_courant_id()
  )
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR')
);
CREATE POLICY "attestation gestion" ON public.attestation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "attestation insertion"
ON public.attestation FOR INSERT TO authenticated
WITH CHECK (
  inscription_id IN ( SELECT i.inscription_id FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
   WHERE p.utilisateur_id = public.utilisateur_courant_id())
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE TABLE public.evenement (
  evenement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titre VARCHAR NOT NULL,
  type_evenement type_evenement_enum NOT NULL DEFAULT 'Autre',
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  lieu VARCHAR,
  statut statut_evenement_enum NOT NULL DEFAULT 'Planifié',
  description TEXT,
  cree_par BIGINT REFERENCES public.utilisateur(utilisateur_id) ON DELETE SET NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evenement TO authenticated;
GRANT ALL ON public.evenement TO service_role;
ALTER TABLE public.evenement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evenement lecture" ON public.evenement FOR SELECT TO authenticated USING (true);
CREATE POLICY "evenement creation" ON public.evenement FOR INSERT TO authenticated WITH CHECK (
  cree_par = public.utilisateur_courant_id()
  OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
);
CREATE POLICY "evenement maj" ON public.evenement FOR UPDATE TO authenticated
  USING (cree_par = public.utilisateur_courant_id() OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (cree_par = public.utilisateur_courant_id() OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));
CREATE POLICY "evenement suppression" ON public.evenement FOR DELETE TO authenticated USING (
  cree_par = public.utilisateur_courant_id() OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
);

CREATE TABLE public.publication (
  publication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auteur_id BIGINT REFERENCES public.utilisateur(utilisateur_id) ON DELETE SET NULL,
  titre VARCHAR NOT NULL,
  contenu TEXT,
  publie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication TO authenticated;
GRANT ALL ON public.publication TO service_role;
ALTER TABLE public.publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publication lecture" ON public.publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "publication gestion" ON public.publication FOR ALL TO authenticated
  USING (auteur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (auteur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE public.media_publication (
  media_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id BIGINT NOT NULL REFERENCES public.publication(publication_id) ON DELETE CASCADE,
  url_media VARCHAR NOT NULL,
  type_media type_media_enum NOT NULL DEFAULT 'Image'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_publication TO authenticated;
GRANT ALL ON public.media_publication TO service_role;
ALTER TABLE public.media_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media lecture" ON public.media_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "media gestion" ON public.media_publication FOR ALL TO authenticated
  USING (publication_id IN (SELECT publication_id FROM public.publication WHERE auteur_id = public.utilisateur_courant_id())
    OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (publication_id IN (SELECT publication_id FROM public.publication WHERE auteur_id = public.utilisateur_courant_id())
    OR public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE public.support_formation (
  support_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formation_id BIGINT NOT NULL REFERENCES public.formation(formation_id) ON DELETE CASCADE,
  titre VARCHAR NOT NULL,
  url_fichier VARCHAR NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_formation TO authenticated;
GRANT ALL ON public.support_formation TO service_role;
ALTER TABLE public.support_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support lecture" ON public.support_formation FOR SELECT TO authenticated USING (true);
CREATE POLICY "support gestion" ON public.support_formation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE') OR public.a_role(auth.uid(), 'FORMATEUR'))
  WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE') OR public.a_role(auth.uid(), 'FORMATEUR'));

CREATE INDEX idx_session_formation_formation ON public.session_formation(formation_id);
CREATE INDEX idx_inscription_session ON public.inscription(session_id);
CREATE INDEX idx_inscription_participant ON public.inscription(participant_id);
CREATE INDEX idx_evenement_debut ON public.evenement(date_debut);