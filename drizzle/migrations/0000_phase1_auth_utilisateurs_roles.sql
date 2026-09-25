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
  email VARCHAR(255) NOT NULL UNIQUE,
  adresse VARCHAR(255),
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
  nom VARCHAR(150) NOT NULL,
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
  service VARCHAR(150),
  intitule_poste VARCHAR(150),
  statut_service public.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE ON public.administrateur TO authenticated;
GRANT ALL ON public.administrateur TO service_role;
ALTER TABLE public.administrateur ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.responsable (
  responsable_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  service VARCHAR(150),
  intitule_poste VARCHAR(150),
  statut_service public.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE ON public.responsable TO authenticated;
GRANT ALL ON public.responsable TO service_role;
ALTER TABLE public.responsable ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.formateur (
  formateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  institution VARCHAR(200),
  intitule_poste VARCHAR(150),
  specialisation VARCHAR(200),
  annees_experience INT,
  curriculum_vitae VARCHAR(500)
);
GRANT SELECT, INSERT, UPDATE ON public.formateur TO authenticated;
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

INSERT INTO public.permission (nom, code, module) VALUES
  ('Consulter les formations','formation.lire','FORMATION'),
  ('Gérer les formations','formation.gerer','FORMATION'),
  ('Consulter les sessions','session.lire','SESSION'),
  ('Gérer les sessions','session.gerer','SESSION'),
  ('S''inscrire à une session','inscription.creer','INSCRIPTION'),
  ('Gérer les inscriptions','inscription.gerer','INSCRIPTION'),
  ('Marquer les présences','presence.gerer','PRESENCE'),
  ('Gérer les utilisateurs','utilisateur.gerer','UTILISATEUR'),
  ('Gérer les rôles','role.gerer','ROLE');

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM public.role r, public.permission p
WHERE (r.code_role = 'ADMINISTRATEUR')
   OR (r.code_role = 'RESPONSABLE' AND p.code IN ('formation.lire','formation.gerer','session.lire','session.gerer','inscription.gerer','presence.gerer'))
   OR (r.code_role = 'FORMATEUR' AND p.code IN ('formation.lire','session.lire','presence.gerer'))
   OR (r.code_role = 'PARTICIPANT' AND p.code IN ('formation.lire','session.lire','inscription.creer'));