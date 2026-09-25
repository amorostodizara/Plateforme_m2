-- ENUMS
CREATE TYPE public.statut_presence_enum AS ENUM ('Présent', 'Absent');
CREATE TYPE public.methode_presence_enum AS ENUM ('QR Code', 'Manuel', 'Système');
CREATE TYPE public.statut_attestation_enum AS ENUM ('Valide', 'Invalide', 'Annulée');
CREATE TYPE public.statut_evaluation_enum AS ENUM ('Brouillon', 'Publiée', 'Fermée');
CREATE TYPE public.type_question_enum AS ENUM ('Choix unique', 'Choix multiple', 'Vrai/Faux');
CREATE TYPE public.statut_tentative_enum AS ENUM ('En cours', 'Soumise', 'Corrigée');
CREATE TYPE public.statut_publication_enum AS ENUM ('Brouillon', 'Publiée', 'Archivée');
CREATE TYPE public.visibilite_publication_enum AS ENUM ('Public', 'Participant', 'Responsable', 'Administrateur', 'Formateur');
CREATE TYPE public.statut_commentaire_enum AS ENUM ('Visible', 'Masqué');
CREATE TYPE public.type_reaction_enum AS ENUM ('J''aime', 'J''adore', 'Bravo', 'Intéressant');

-- PRESENCE : statut, méthode, remarque
ALTER TABLE public.presence ADD COLUMN statut public.statut_presence_enum NOT NULL DEFAULT 'Présent';
ALTER TABLE public.presence ADD COLUMN methode public.methode_presence_enum NOT NULL DEFAULT 'Manuel';
ALTER TABLE public.presence ADD COLUMN remarque text;
ALTER TABLE public.presence ADD COLUMN enregistre_le timestamptz NOT NULL DEFAULT now();
UPDATE public.presence SET statut = CASE WHEN present THEN 'Présent'::public.statut_presence_enum ELSE 'Absent'::public.statut_presence_enum END;

-- ATTESTATION
ALTER TABLE public.attestation ADD COLUMN numero_attestation varchar;
ALTER TABLE public.attestation ADD COLUMN jeton_verification varchar;
ALTER TABLE public.attestation ADD COLUMN statut public.statut_attestation_enum NOT NULL DEFAULT 'Valide';
UPDATE public.attestation SET numero_attestation = 'ATT-' || lpad(attestation_id::text, 6, '0'),
  jeton_verification = replace(gen_random_uuid()::text, '-', '') WHERE numero_attestation IS NULL;

-- PUBLICATION
ALTER TABLE public.publication ADD COLUMN statut public.statut_publication_enum NOT NULL DEFAULT 'Publiée';
ALTER TABLE public.publication ADD COLUMN visibilite public.visibilite_publication_enum NOT NULL DEFAULT 'Public';
ALTER TABLE public.media_publication ADD COLUMN nom_fichier varchar;
ALTER TABLE public.media_publication ADD COLUMN taille_fichier bigint;

-- EVALUATION
CREATE TABLE public.evaluation (
  evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id bigint NOT NULL REFERENCES public.session_formation(session_id) ON DELETE CASCADE,
  titre_evaluation varchar NOT NULL,
  date_publication timestamptz,
  date_fermeture timestamptz,
  duree_minutes integer NOT NULL DEFAULT 30,
  max_tentatives integer NOT NULL DEFAULT 1,
  score_reussite numeric NOT NULL DEFAULT 50,
  statut public.statut_evaluation_enum NOT NULL DEFAULT 'Brouillon',
  cree_par bigint REFERENCES public.utilisateur(utilisateur_id),
  cree_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation TO authenticated;
GRANT ALL ON public.evaluation TO service_role;
ALTER TABLE public.evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture evaluation" ON public.evaluation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion evaluation" ON public.evaluation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE public.question_evaluation (
  question_evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evaluation_id bigint NOT NULL REFERENCES public.evaluation(evaluation_id) ON DELETE CASCADE,
  texte_question text NOT NULL,
  type_question public.type_question_enum NOT NULL DEFAULT 'Choix unique',
  ordre_question integer NOT NULL DEFAULT 1,
  points numeric NOT NULL DEFAULT 1,
  est_requis boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_evaluation TO authenticated;
GRANT ALL ON public.question_evaluation TO service_role;
ALTER TABLE public.question_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture questions" ON public.question_evaluation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion questions" ON public.question_evaluation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE public.option_question (
  option_question_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_evaluation_id bigint NOT NULL REFERENCES public.question_evaluation(question_evaluation_id) ON DELETE CASCADE,
  texte_option varchar NOT NULL,
  est_correct boolean NOT NULL DEFAULT false,
  ordre_option integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.option_question TO authenticated;
GRANT ALL ON public.option_question TO service_role;
ALTER TABLE public.option_question ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture options" ON public.option_question FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion options" ON public.option_question FOR ALL TO authenticated
  USING (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE public.tentative_evaluation (
  tentative_evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evaluation_id bigint NOT NULL REFERENCES public.evaluation(evaluation_id) ON DELETE CASCADE,
  inscription_id bigint NOT NULL REFERENCES public.inscription(inscription_id) ON DELETE CASCADE,
  numero_tentative integer NOT NULL DEFAULT 1,
  commence_le timestamptz NOT NULL DEFAULT now(),
  soumis_le timestamptz,
  score numeric,
  statut public.statut_tentative_enum NOT NULL DEFAULT 'En cours',
  reussi boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tentative_evaluation TO authenticated;
GRANT ALL ON public.tentative_evaluation TO service_role;
ALTER TABLE public.tentative_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture tentatives" ON public.tentative_evaluation FOR SELECT TO authenticated USING (
  public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (SELECT 1 FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
             WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = public.utilisateur_courant_id())
);
CREATE POLICY "Ecriture tentatives" ON public.tentative_evaluation FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
          WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = public.utilisateur_courant_id())
);
CREATE POLICY "Maj tentatives" ON public.tentative_evaluation FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
          WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = public.utilisateur_courant_id())
);

CREATE TABLE public.reponse_participant (
  reponse_participant_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tentative_evaluation_id bigint NOT NULL REFERENCES public.tentative_evaluation(tentative_evaluation_id) ON DELETE CASCADE,
  question_evaluation_id bigint NOT NULL REFERENCES public.question_evaluation(question_evaluation_id) ON DELETE CASCADE,
  option_question_id bigint REFERENCES public.option_question(option_question_id) ON DELETE CASCADE,
  est_correct boolean NOT NULL DEFAULT false,
  points_gagnes numeric NOT NULL DEFAULT 0,
  repondu_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reponse_participant TO authenticated;
GRANT ALL ON public.reponse_participant TO service_role;
ALTER TABLE public.reponse_participant ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture reponses" ON public.reponse_participant FOR SELECT TO authenticated USING (
  public.a_role(auth.uid(),'FORMATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (SELECT 1 FROM public.tentative_evaluation t JOIN public.inscription i ON i.inscription_id = t.inscription_id
             JOIN public.participant p ON p.participant_id = i.participant_id
             WHERE t.tentative_evaluation_id = reponse_participant.tentative_evaluation_id AND p.utilisateur_id = public.utilisateur_courant_id())
);
CREATE POLICY "Ecriture reponses" ON public.reponse_participant FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.tentative_evaluation t JOIN public.inscription i ON i.inscription_id = t.inscription_id
          JOIN public.participant p ON p.participant_id = i.participant_id
          WHERE t.tentative_evaluation_id = reponse_participant.tentative_evaluation_id AND p.utilisateur_id = public.utilisateur_courant_id())
);

CREATE TABLE public.commentaire_publication (
  commentaire_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id bigint NOT NULL REFERENCES public.publication(publication_id) ON DELETE CASCADE,
  utilisateur_id bigint NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  contenu text NOT NULL,
  statut public.statut_commentaire_enum NOT NULL DEFAULT 'Visible',
  cree_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commentaire_publication TO authenticated;
GRANT ALL ON public.commentaire_publication TO service_role;
ALTER TABLE public.commentaire_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture commentaires" ON public.commentaire_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ecriture commentaires" ON public.commentaire_publication FOR INSERT TO authenticated
  WITH CHECK (utilisateur_id = public.utilisateur_courant_id());
CREATE POLICY "Maj commentaires" ON public.commentaire_publication FOR UPDATE TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "Suppression commentaires" ON public.commentaire_publication FOR DELETE TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));

CREATE TABLE public.reaction_publication (
  reaction_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id bigint NOT NULL REFERENCES public.publication(publication_id) ON DELETE CASCADE,
  utilisateur_id bigint NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_reaction public.type_reaction_enum NOT NULL DEFAULT 'J''aime',
  cree_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, utilisateur_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reaction_publication TO authenticated;
GRANT ALL ON public.reaction_publication TO service_role;
ALTER TABLE public.reaction_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture reactions" ON public.reaction_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion reactions" ON public.reaction_publication FOR ALL TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = public.utilisateur_courant_id());

CREATE TABLE public.modele_attestation (
  modele_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_modele varchar NOT NULL DEFAULT 'Modèle par défaut',
  url_logo varchar,
  titre_attestation varchar NOT NULL DEFAULT 'Attestation de formation',
  texte_attestation text,
  nom_signataire varchar,
  fonction_signataire varchar,
  url_signature varchar,
  pied_de_page text,
  couleur_principale varchar NOT NULL DEFAULT '#FF7900',
  actif boolean NOT NULL DEFAULT true,
  maj_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modele_attestation TO authenticated;
GRANT ALL ON public.modele_attestation TO service_role;
ALTER TABLE public.modele_attestation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture modele" ON public.modele_attestation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion modele" ON public.modele_attestation FOR ALL TO authenticated
  USING (public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'))
  WITH CHECK (public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));

CREATE INDEX idx_question_evaluation ON public.question_evaluation(evaluation_id);
CREATE INDEX idx_option_question ON public.option_question(question_evaluation_id);
CREATE INDEX idx_tentative_evaluation ON public.tentative_evaluation(evaluation_id);
CREATE INDEX idx_commentaire_publication ON public.commentaire_publication(publication_id);
CREATE INDEX idx_reaction_publication ON public.reaction_publication(publication_id);
