-- ENUMS
CREATE TYPE public.genre_enum AS ENUM ('Homme','Femme');
CREATE TYPE public.statut_actif_enum AS ENUM ('Actif','Inactif');
CREATE TYPE public.code_role_enum AS ENUM ('PARTICIPANT','FORMATEUR','RESPONSABLE','ADMINISTRATEUR');
CREATE TYPE public.statut_actuel_enum AS ENUM ('Étudiant','Employé','Fonctionnaire','Chômeur','Indépendant','Entrepreneur','Autre');
CREATE TYPE public.niveau_education_enum AS ENUM ('BEPC','BAC','L1','L2','L3','M1','M2','Doctorat','Autre');

-- UTILISATEUR
CREATE TABLE public.utilisateur (
  utilisateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL DEFAULT '',
  prenoms VARCHAR(150) NOT NULL DEFAULT '',
  telephone VARCHAR(30),
  email VARCHAR(100) NOT NULL UNIQUE,
  adresse VARCHAR(100),
  genre public.genre_enum,
  url_profil VARCHAR(500),
  statut public.statut_actif_enum NOT NULL DEFAULT 'Actif',
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.utilisateur TO authenticated;
GRANT ALL ON public.utilisateur TO service_role;
ALTER TABLE public.utilisateur ENABLE ROW LEVEL SECURITY;

-- ROLE
CREATE TABLE public.role (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_role VARCHAR(100) NOT NULL,
  code_role public.code_role_enum NOT NULL UNIQUE,
  statut public.statut_actif_enum NOT NULL DEFAULT 'Actif',
  description TEXT
);
GRANT SELECT ON public.role TO authenticated;
GRANT ALL ON public.role TO service_role;
ALTER TABLE public.role ENABLE ROW LEVEL SECURITY;

-- PERMISSION
CREATE TABLE public.permission (
  permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(100) NOT NULL
);
GRANT SELECT ON public.permission TO authenticated;
GRANT ALL ON public.permission TO service_role;
ALTER TABLE public.permission ENABLE ROW LEVEL SECURITY;

-- ROLE_PERMISSION
CREATE TABLE public.role_permission (
  role_permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES public.role(role_id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES public.permission(permission_id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);
GRANT SELECT ON public.role_permission TO authenticated;
GRANT ALL ON public.role_permission TO service_role;
ALTER TABLE public.role_permission ENABLE ROW LEVEL SECURITY;

-- ROLE_UTILISATEUR
CREATE TABLE public.role_utilisateur (
  role_utilisateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES public.role(role_id) ON DELETE CASCADE,
  UNIQUE (utilisateur_id, role_id)
);
GRANT SELECT ON public.role_utilisateur TO authenticated;
GRANT ALL ON public.role_utilisateur TO service_role;
ALTER TABLE public.role_utilisateur ENABLE ROW LEVEL SECURITY;

-- PROFILS METIER
CREATE TABLE public.administrateur (
  admin_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  service VARCHAR(100),
  intitule_poste VARCHAR(100),
  statut_service public.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE ON public.administrateur TO authenticated;
GRANT ALL ON public.administrateur TO service_role;
ALTER TABLE public.administrateur ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.responsable (
  responsable_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  service VARCHAR(100),
  intitule_poste VARCHAR(100),
  statut_service public.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsable TO authenticated;
GRANT ALL ON public.responsable TO service_role;
ALTER TABLE public.responsable ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.formateur (
  formateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  institution VARCHAR(100),
  intitule_poste VARCHAR(100),
  specialisation VARCHAR(100),
  annees_experience INT,
  curriculum_vitae VARCHAR(500)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formateur TO authenticated;
GRANT ALL ON public.formateur TO service_role;
ALTER TABLE public.formateur ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.participant (
  participant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  date_naissance DATE,
  codeqr_jeton VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16),'hex')
);
GRANT SELECT, INSERT, UPDATE ON public.participant TO authenticated;
GRANT ALL ON public.participant TO service_role;
ALTER TABLE public.participant ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profil_professionnel (
  profil_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id BIGINT NOT NULL UNIQUE REFERENCES public.participant(participant_id) ON DELETE CASCADE,
  statut_actuel public.statut_actuel_enum,
  institution VARCHAR(200),
  specialisation VARCHAR(200),
  mention VARCHAR(150),
  niveau_education public.niveau_education_enum
);
GRANT SELECT, INSERT, UPDATE ON public.profil_professionnel TO authenticated;
GRANT ALL ON public.profil_professionnel TO service_role;
ALTER TABLE public.profil_professionnel ENABLE ROW LEVEL SECURITY;

-- JETONS
CREATE TABLE public.jeton_creation_compte (
  jeton_creation_compte_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  jeton VARCHAR(255) NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_le TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  verifie_le TIMESTAMPTZ,
  revoque_le TIMESTAMPTZ
);
GRANT ALL ON public.jeton_creation_compte TO service_role;
ALTER TABLE public.jeton_creation_compte ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.jeton_mot_de_passe_oublie (
  jeton_mot_de_passe_oublie_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  jeton VARCHAR(255) NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_le TIMESTAMPTZ NOT NULL DEFAULT now() + interval '60 minutes',
  utilise_le TIMESTAMPTZ,
  revoque_le TIMESTAMPTZ
);
GRANT ALL ON public.jeton_mot_de_passe_oublie TO service_role;
ALTER TABLE public.jeton_mot_de_passe_oublie ENABLE ROW LEVEL SECURITY;

-- FONCTIONS DE SECURITE
CREATE OR REPLACE FUNCTION public.utilisateur_courant_id()
RETURNS BIGINT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.utilisateur_id FROM public.utilisateur u WHERE u.auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.a_role(_auth_user_id UUID, _code public.code_role_enum)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_utilisateur ru
    JOIN public.utilisateur u ON u.utilisateur_id = ru.utilisateur_id
    JOIN public.role r ON r.role_id = ru.role_id
    WHERE u.auth_user_id = _auth_user_id AND r.code_role = _code AND r.statut = 'Actif'
  );
$$;

CREATE OR REPLACE FUNCTION public.a_permission(_auth_user_id UUID, _code VARCHAR)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_utilisateur ru
    JOIN public.utilisateur u ON u.utilisateur_id = ru.utilisateur_id
    JOIN public.role_permission rp ON rp.role_id = ru.role_id
    JOIN public.permission p ON p.permission_id = rp.permission_id
    WHERE u.auth_user_id = _auth_user_id AND p.code = _code
  );
$$;

-- POLITIQUES
CREATE POLICY "utilisateur lit son profil" ON public.utilisateur FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "utilisateur modifie son profil" ON public.utilisateur FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Administrateur supprime un formateur"
ON public.formateur FOR DELETE TO authenticated USING ( public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "Administrateur supprime un responsable"
ON public.responsable FOR DELETE TO authenticated USING (public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "Administrateur supprime un participant"
ON public.participant FOR DELETE TO authenticated USING (public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "roles visibles" ON public.role FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions visibles" ON public.permission FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permission visibles" ON public.role_permission FOR SELECT TO authenticated USING (true);
CREATE POLICY "ses roles visibles" ON public.role_utilisateur FOR SELECT TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE POLICY "participant lit son profil" ON public.participant FOR SELECT TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE') OR public.a_role(auth.uid(),'FORMATEUR'));
CREATE POLICY "participant modifie son profil" ON public.participant FOR UPDATE TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id()) WITH CHECK (utilisateur_id = public.utilisateur_courant_id());

CREATE POLICY "profil pro lecture" ON public.profil_professionnel FOR SELECT TO authenticated
  USING (participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id())
         OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "profil pro insertion" ON public.profil_professionnel FOR INSERT TO authenticated
  WITH CHECK (participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id()));
CREATE POLICY "profil pro maj" ON public.profil_professionnel FOR UPDATE TO authenticated
  USING (participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id()))
  WITH CHECK (participant_id IN (SELECT participant_id FROM public.participant WHERE utilisateur_id = public.utilisateur_courant_id()));

CREATE POLICY "formateur lecture" ON public.formateur FOR SELECT TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR') OR public.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "formateur maj" ON public.formateur FOR UPDATE TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id()) WITH CHECK (utilisateur_id = public.utilisateur_courant_id());

CREATE POLICY "responsable lecture" ON public.responsable FOR SELECT TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR'));
CREATE POLICY "administrateur lecture" ON public.administrateur FOR SELECT TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id() OR public.a_role(auth.uid(),'ADMINISTRATEUR'));

-- TRIGGER: creation automatique du compte applicatif
CREATE OR REPLACE FUNCTION public.creer_utilisateur_applicatif()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_utilisateur_id BIGINT;
  v_role_id BIGINT;
  v_participant_id BIGINT;
BEGIN
  INSERT INTO public.utilisateur (auth_user_id, nom, prenoms, email, telephone, url_profil, email_verifie)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenoms', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'telephone',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING utilisateur_id INTO v_utilisateur_id;

  IF v_utilisateur_id IS NULL THEN
    SELECT utilisateur_id INTO v_utilisateur_id FROM public.utilisateur WHERE auth_user_id = NEW.id;
  END IF;

  SELECT role_id INTO v_role_id FROM public.role WHERE code_role = 'PARTICIPANT';
  INSERT INTO public.role_utilisateur (utilisateur_id, role_id)
  VALUES (v_utilisateur_id, v_role_id) ON CONFLICT DO NOTHING;

  INSERT INTO public.participant (utilisateur_id) VALUES (v_utilisateur_id)
  ON CONFLICT (utilisateur_id) DO NOTHING
  RETURNING participant_id INTO v_participant_id;

  IF v_participant_id IS NULL THEN
    SELECT participant_id INTO v_participant_id FROM public.participant WHERE utilisateur_id = v_utilisateur_id;
  END IF;

  INSERT INTO public.profil_professionnel (participant_id) VALUES (v_participant_id)
  ON CONFLICT (participant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.creer_utilisateur_applicatif();

CREATE OR REPLACE FUNCTION public.sync_email_verifie()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.utilisateur
  SET email_verifie = (NEW.email_confirmed_at IS NOT NULL), email = NEW.email, maj_le = now()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_email_verifie();

-- DONNEES DE REFERENCE
INSERT INTO public.role (nom_role, code_role, description) VALUES
  ('Participant','PARTICIPANT','Suit les formations et sessions'),
  ('Formateur','FORMATEUR','Anime les sessions de formation'),
  ('Responsable','RESPONSABLE','Pilote les formations et les inscriptions'),
  ('Administrateur','ADMINISTRATEUR','Administre la plateforme');



   -- Matrice complète des droits : 38 permissions et 106 autorisations par acteur.
-- Identique à la base hébergée. Idempotent : peut être rejoué sans doublon.

INSERT INTO public.permission (nom, code, module) VALUES
  ('Consulter le tableau de bord', 'dashboard.lire', 'Tableau de bord'),
  ('Consulter l''agenda', 'agenda.lire', 'Agenda'),
  ('Gérer les événements de l''agenda', 'agenda.gerer', 'Agenda'),
  ('Consulter le catalogue', 'catalogue.lire', 'Catalogue'),
  ('Gérer le catalogue', 'catalogue.gerer', 'Catalogue'),
  ('S''inscrire à une session', 'inscription.creer', 'Inscriptions'),
  ('Consulter ses inscriptions', 'inscription.lire', 'Inscriptions'),
  ('Gérer les inscriptions', 'inscription.gerer', 'Inscriptions'),
  ('Consulter ses présences', 'presence.lire', 'Présence'),
  ('Gérer les présences', 'presence.gerer', 'Présence'),
  ('Consulter les évaluations', 'evaluation.lire', 'Évaluations'),
  ('Créer et gérer les évaluations', 'evaluation.gerer', 'Évaluations'),
  ('Passer une évaluation', 'evaluation.passer', 'Évaluations'),
  ('Consulter ses attestations', 'attestation.lire', 'Mes attestations'),
  ('Consulter les supports', 'support.lire', 'Supports'),
  ('Créer et gérer les supports', 'support.gerer', 'Supports'),
  ('Consulter les publications', 'publication.lire', 'Fil d''actualité'),
  ('Gérer les publications', 'publication.gerer', 'Fil d''actualité'),
  ('Gérer les commentaires', 'commentaire.gerer', 'Fil d''actualité'),
  ('Gérer ses réactions', 'reaction.gerer', 'Fil d''actualité'),
  ('Utiliser l''assistant IA', 'ia.lire', 'Assistant IA'),
  ('Donner un retour sur l''assistant IA', 'ia.retour', 'Assistant IA'),
  ('Consulter les formations', 'formation.lire', 'Administration'),
  ('Gérer les formations', 'formation.gerer', 'Administration'),
  ('Consulter les sessions', 'session.lire', 'Administration'),
  ('Gérer les sessions', 'session.gerer', 'Administration'),
  ('Consulter les formateurs', 'formateur.lire', 'Administration'),
  ('Gérer les formateurs', 'formateur.gerer', 'Administration'),
  ('Consulter les paiements formateurs', 'paiement_formateur.lire', 'Administration'),
  ('Gérer les paiements formateurs', 'paiement_formateur.gerer', 'Administration'),
  ('Consulter les participants', 'participant.lire', 'Administration'),
  ('Gérer les participants', 'participant.gerer', 'Administration'),
  ('Consulter les responsables', 'responsable.lire', 'Administration'),
  ('Gérer les responsables', 'responsable.gerer', 'Administration'),
  ('Consulter les utilisateurs', 'utilisateur.lire', 'Administration'),
  ('Gérer les utilisateurs', 'utilisateur.gerer', 'Administration'),
  ('Gérer les rôles et permissions', 'role.gerer', 'Administration'),
  ('Consulter les logs d''activités', 'journal.lire', 'Administration')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, module = EXCLUDED.module;

WITH matrice(code_role, code) AS (
  VALUES
    -- PARTICIPANT (17)
    ('PARTICIPANT','dashboard.lire'),('PARTICIPANT','agenda.lire'),('PARTICIPANT','catalogue.lire'),
    ('PARTICIPANT','inscription.creer'),('PARTICIPANT','inscription.lire'),('PARTICIPANT','presence.lire'),
    ('PARTICIPANT','evaluation.lire'),('PARTICIPANT','evaluation.passer'),('PARTICIPANT','attestation.lire'),
    ('PARTICIPANT','support.lire'),('PARTICIPANT','support.gerer'),('PARTICIPANT','publication.lire'),
    ('PARTICIPANT','reaction.gerer'),('PARTICIPANT','ia.lire'),('PARTICIPANT','ia.retour'),
    ('PARTICIPANT','formation.lire'),('PARTICIPANT','session.lire'),
    -- FORMATEUR (18)
    ('FORMATEUR','dashboard.lire'),('FORMATEUR','agenda.lire'),('FORMATEUR','catalogue.lire'),
    ('FORMATEUR','presence.lire'),('FORMATEUR','presence.gerer'),('FORMATEUR','evaluation.lire'),
    ('FORMATEUR','evaluation.gerer'),('FORMATEUR','attestation.lire'),('FORMATEUR','support.lire'),
    ('FORMATEUR','support.gerer'),('FORMATEUR','publication.lire'),('FORMATEUR','reaction.gerer'),
    ('FORMATEUR','ia.lire'),('FORMATEUR','ia.retour'),('FORMATEUR','formation.lire'),
    ('FORMATEUR','session.lire'),('FORMATEUR','participant.lire'),('FORMATEUR','paiement_formateur.lire'),
    -- RESPONSABLE (33)
    ('RESPONSABLE','dashboard.lire'),('RESPONSABLE','agenda.lire'),('RESPONSABLE','agenda.gerer'),
    ('RESPONSABLE','catalogue.lire'),('RESPONSABLE','catalogue.gerer'),('RESPONSABLE','inscription.creer'),
    ('RESPONSABLE','inscription.lire'),('RESPONSABLE','inscription.gerer'),('RESPONSABLE','presence.lire'),
    ('RESPONSABLE','presence.gerer'),('RESPONSABLE','evaluation.lire'),('RESPONSABLE','evaluation.gerer'),
    ('RESPONSABLE','attestation.lire'),('RESPONSABLE','support.lire'),('RESPONSABLE','support.gerer'),
    ('RESPONSABLE','publication.lire'),('RESPONSABLE','publication.gerer'),('RESPONSABLE','commentaire.gerer'),
    ('RESPONSABLE','reaction.gerer'),('RESPONSABLE','ia.lire'),('RESPONSABLE','ia.retour'),
    ('RESPONSABLE','formation.lire'),('RESPONSABLE','formation.gerer'),('RESPONSABLE','session.lire'),
    ('RESPONSABLE','session.gerer'),('RESPONSABLE','formateur.lire'),('RESPONSABLE','formateur.gerer'),
    ('RESPONSABLE','paiement_formateur.lire'),('RESPONSABLE','paiement_formateur.gerer'),
    ('RESPONSABLE','participant.lire'),('RESPONSABLE','participant.gerer'),
    ('RESPONSABLE','responsable.lire'),('RESPONSABLE','responsable.gerer')
)
INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM matrice m
JOIN public.role r ON r.code_role::text = m.code_role
JOIN public.permission p ON p.code = m.code
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permission rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
);

-- -- ADMINISTRATEUR : toutes les permissions (38)
-- INSERT INTO public.role_permission (role_id, permission_id)
-- SELECT r.role_id, p.permission_id
-- FROM public.role r CROSS JOIN public.permission p
-- WHERE r.code_role = 'ADMINISTRATEUR'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.role_permission rp
--     WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
--   );

  
-- INSERT INTO public.role_permission (role_id, permission_id)
-- SELECT r.role_id, p.permission_id FROM public.role r, public.permission p
-- WHERE (r.code_role = 'ADMINISTRATEUR')
--    OR (r.code_role = 'RESPONSABLE' AND p.code IN ('formation.lire','formation.gerer','session.lire','session.gerer','inscription.gerer','presence.gerer'))
--    OR (r.code_role = 'FORMATEUR' AND p.code IN ('formation.lire','session.lire','presence.gerer'))
--    OR (r.code_role = 'PARTICIPANT' AND p.code IN ('formation.lire','session.lire','inscription.creer'));
