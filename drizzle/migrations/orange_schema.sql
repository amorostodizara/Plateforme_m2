CREATE SCHEMA IF NOT EXISTS orange;
GRANT USAGE ON SCHEMA orange
TO anon, authenticated, service_role;

CREATE TYPE orange.genre_enum AS ENUM ('Homme','Femme');
CREATE TYPE orange.statut_actif_enum AS ENUM ('Actif','Inactif');
CREATE TYPE orange.code_role_enum AS ENUM ('PARTICIPANT','FORMATEUR','RESPONSABLE','ADMINISTRATEUR');
CREATE TYPE orange.statut_actuel_enum AS ENUM ('Étudiant','Employé','Fonctionnaire','Chômeur','Indépendant','Entrepreneur','Autre');
CREATE TYPE orange.niveau_education_enum AS ENUM ('BEPC','BAC','L1','L2','L3','M1','M2','Doctorat','Autre');


CREATE TYPE orange.niveau_formation_enum AS ENUM ('Débutant', 'Intermédiaire', 'Avancé');
CREATE TYPE orange.statut_formation_enum AS ENUM ('Brouillon', 'Publiée', 'Archivée');
CREATE TYPE orange.statut_session_enum AS ENUM ('Planifiée', 'En cours', 'Terminée', 'Annulée');
CREATE TYPE orange.statut_inscription_enum AS ENUM ('En attente', 'Acceptée', 'Refusée', 'Liste d''attente', 'Annulée');
CREATE TYPE orange.type_evenement_enum AS ENUM ('Réunion', 'Atelier', 'Conférence', 'Cérémonie', 'Autre');
CREATE TYPE orange.statut_evenement_enum AS ENUM ('Brouillon', 'Planifié', 'En cours', 'Terminé', 'Annulé');
CREATE TYPE orange.type_media_enum AS ENUM ('Image', 'Vidéo', 'Document');

CREATE TYPE orange.statut_presence_enum AS ENUM ('Présent', 'Absent');
CREATE TYPE orange.methode_presence_enum AS ENUM ('QR Code', 'Manuel', 'Système');
CREATE TYPE orange.statut_attestation_enum AS ENUM ('Valide', 'Invalide', 'Annulée');
CREATE TYPE orange.statut_evaluation_enum AS ENUM ('Brouillon', 'Publiée', 'Fermée');
CREATE TYPE orange.type_question_enum AS ENUM ('Choix unique', 'Choix multiple', 'Vrai/Faux');
CREATE TYPE orange.statut_tentative_enum AS ENUM ('En cours', 'Soumise', 'Corrigée');
CREATE TYPE orange.statut_publication_enum AS ENUM ('Brouillon', 'Publiée', 'Archivée');
CREATE TYPE orange.visibilite_publication_enum AS ENUM ('Public', 'Participant', 'Responsable', 'Administrateur', 'Formateur');
CREATE TYPE orange.statut_commentaire_enum AS ENUM ('Visible', 'Masqué');
CREATE TYPE orange.type_reaction_enum AS ENUM ('J''aime', 'J''adore', 'Bravo', 'Intéressant');

CREATE TYPE orange.type_retour_ia_enum AS ENUM ('Positive', 'Négative');


-- UTILISATEUR
CREATE TABLE orange.utilisateur (
  utilisateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL DEFAULT '',
  prenoms VARCHAR(150) NOT NULL DEFAULT '',
  telephone VARCHAR(30),
  email VARCHAR(100) NOT NULL UNIQUE,
  adresse VARCHAR(100),
  genre orange.genre_enum,
  url_profil VARCHAR(500),
  statut orange.statut_actif_enum NOT NULL DEFAULT 'Actif',
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON orange.utilisateur TO authenticated;
GRANT ALL ON orange.utilisateur TO service_role;
ALTER TABLE orange.utilisateur ENABLE ROW LEVEL SECURITY;

-- ROLE
CREATE TABLE orange.role (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_role VARCHAR(100) NOT NULL,
  code_role orange.code_role_enum NOT NULL UNIQUE,
  statut orange.statut_actif_enum NOT NULL DEFAULT 'Actif',
  description TEXT
);
GRANT SELECT ON orange.role TO authenticated;
GRANT ALL ON orange.role TO service_role;
ALTER TABLE orange.role ENABLE ROW LEVEL SECURITY;

-- PERMISSION
CREATE TABLE orange.permission (
  permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(100) NOT NULL
);
GRANT SELECT ON orange.permission TO authenticated;
GRANT ALL ON orange.permission TO service_role;
ALTER TABLE orange.permission ENABLE ROW LEVEL SECURITY;

-- ROLE_PERMISSION
CREATE TABLE orange.role_permission (
  role_permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES orange.role(role_id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES orange.permission(permission_id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);
GRANT SELECT ON orange.role_permission TO authenticated;
GRANT ALL ON orange.role_permission TO service_role;
ALTER TABLE orange.role_permission ENABLE ROW LEVEL SECURITY;

-- ROLE_UTILISATEUR
CREATE TABLE orange.role_utilisateur (
  role_utilisateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES orange.role(role_id) ON DELETE CASCADE,
  UNIQUE (utilisateur_id, role_id)
);
GRANT SELECT ON orange.role_utilisateur TO authenticated;
GRANT ALL ON orange.role_utilisateur TO service_role;
ALTER TABLE orange.role_utilisateur ENABLE ROW LEVEL SECURITY;

-- PROFILS METIER
CREATE TABLE orange.administrateur (
  admin_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  service VARCHAR(100),
  intitule_poste VARCHAR(100),
  statut_service orange.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE ON orange.administrateur TO authenticated;
GRANT ALL ON orange.administrateur TO service_role;
ALTER TABLE orange.administrateur ENABLE ROW LEVEL SECURITY;

CREATE TABLE orange.responsable (
  responsable_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  service VARCHAR(100),
  intitule_poste VARCHAR(100),
  statut_service orange.statut_actif_enum NOT NULL DEFAULT 'Actif'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.responsable TO authenticated;
GRANT ALL ON orange.responsable TO service_role;
ALTER TABLE orange.responsable ENABLE ROW LEVEL SECURITY;

CREATE TABLE orange.formateur (
  formateur_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  institution VARCHAR(100),
  intitule_poste VARCHAR(100),
  specialisation VARCHAR(100),
  annees_experience INT,
  curriculum_vitae VARCHAR(500)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.formateur TO authenticated;
GRANT ALL ON orange.formateur TO service_role;
ALTER TABLE orange.formateur ENABLE ROW LEVEL SECURITY;

CREATE TABLE orange.participant (
  participant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  date_naissance DATE,
  codeqr_jeton VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16),'hex')
);
GRANT SELECT, INSERT, UPDATE ON orange.participant TO authenticated;
GRANT ALL ON orange.participant TO service_role;
ALTER TABLE orange.participant ENABLE ROW LEVEL SECURITY;

CREATE TABLE orange.profil_professionnel (
  profil_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id BIGINT NOT NULL UNIQUE REFERENCES orange.participant(participant_id) ON DELETE CASCADE,
  statut_actuel orange.statut_actuel_enum,
  institution VARCHAR(200),
  specialisation VARCHAR(200),
  mention VARCHAR(150),
  niveau_education orange.niveau_education_enum
);
GRANT SELECT, INSERT, UPDATE ON orange.profil_professionnel TO authenticated;
GRANT ALL ON orange.profil_professionnel TO service_role;
ALTER TABLE orange.profil_professionnel ENABLE ROW LEVEL SECURITY;

-- JETONS
CREATE TABLE orange.jeton_creation_compte (
  jeton_creation_compte_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  jeton VARCHAR(255) NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_le TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  verifie_le TIMESTAMPTZ,
  revoque_le TIMESTAMPTZ
);
GRANT ALL ON orange.jeton_creation_compte TO service_role;
ALTER TABLE orange.jeton_creation_compte ENABLE ROW LEVEL SECURITY;

CREATE TABLE orange.jeton_mot_de_passe_oublie (
  jeton_mot_de_passe_oublie_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  jeton VARCHAR(255) NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_le TIMESTAMPTZ NOT NULL DEFAULT now() + interval '60 minutes',
  utilise_le TIMESTAMPTZ,
  revoque_le TIMESTAMPTZ
);
GRANT ALL ON orange.jeton_mot_de_passe_oublie TO service_role;
ALTER TABLE orange.jeton_mot_de_passe_oublie ENABLE ROW LEVEL SECURITY;

-- FONCTIONS DE SECURITE
CREATE OR REPLACE FUNCTION orange.utilisateur_courant_id()
RETURNS BIGINT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = orange AS $$
  SELECT u.utilisateur_id FROM orange.utilisateur u WHERE u.auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION orange.a_role(_auth_user_id UUID, _code orange.code_role_enum)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = orange AS $$
  SELECT EXISTS (
    SELECT 1 FROM orange.role_utilisateur ru
    JOIN orange.utilisateur u ON u.utilisateur_id = ru.utilisateur_id
    JOIN orange.role r ON r.role_id = ru.role_id
    WHERE u.auth_user_id = _auth_user_id AND r.code_role = _code AND r.statut = 'Actif'
  );
$$;

CREATE OR REPLACE FUNCTION orange.a_permission(_auth_user_id UUID, _code VARCHAR)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = orange AS $$
  SELECT EXISTS (
    SELECT 1 FROM orange.role_utilisateur ru
    JOIN orange.utilisateur u ON u.utilisateur_id = ru.utilisateur_id
    JOIN orange.role_permission rp ON rp.role_id = ru.role_id
    JOIN orange.permission p ON p.permission_id = rp.permission_id
    WHERE u.auth_user_id = _auth_user_id AND p.code = _code
  );
$$;

-- POLITIQUES
CREATE POLICY "utilisateur lit son profil" ON orange.utilisateur FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "utilisateur modifie son profil" ON orange.utilisateur FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Administrateur supprime un formateur"
ON orange.formateur FOR DELETE TO authenticated USING ( orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "Administrateur supprime un responsable"
ON orange.responsable FOR DELETE TO authenticated USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "Administrateur supprime un participant"
ON orange.participant FOR DELETE TO authenticated USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "roles visibles" ON orange.role FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions visibles" ON orange.permission FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permission visibles" ON orange.role_permission FOR SELECT TO authenticated USING (true);
CREATE POLICY "ses roles visibles" ON orange.role_utilisateur FOR SELECT TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE POLICY "participant lit son profil" ON orange.participant FOR SELECT TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'FORMATEUR'));
CREATE POLICY "participant modifie son profil" ON orange.participant FOR UPDATE TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id()) WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());

CREATE POLICY "profil pro lecture" ON orange.profil_professionnel FOR SELECT TO authenticated
  USING (participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id())
         OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "profil pro insertion" ON orange.profil_professionnel FOR INSERT TO authenticated
  WITH CHECK (participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id()));
CREATE POLICY "profil pro maj" ON orange.profil_professionnel FOR UPDATE TO authenticated
  USING (participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id()))
  WITH CHECK (participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id()));

CREATE POLICY "formateur lecture" ON orange.formateur FOR SELECT TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "formateur maj" ON orange.formateur FOR UPDATE TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id()) WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());

CREATE POLICY "responsable lecture" ON orange.responsable FOR SELECT TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));
CREATE POLICY "administrateur lecture" ON orange.administrateur FOR SELECT TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));

-- TRIGGER: creation automatique du compte applicatif
CREATE OR REPLACE FUNCTION orange.creer_utilisateur_applicatif()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
DECLARE
  v_utilisateur_id BIGINT;
  v_role_id BIGINT;
  v_participant_id BIGINT;
BEGIN
  INSERT INTO orange.utilisateur (auth_user_id, nom, prenoms, email, telephone, url_profil, email_verifie)
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
    SELECT utilisateur_id INTO v_utilisateur_id FROM orange.utilisateur WHERE auth_user_id = NEW.id;
  END IF;

  SELECT role_id INTO v_role_id FROM orange.role WHERE code_role = 'PARTICIPANT';
  INSERT INTO orange.role_utilisateur (utilisateur_id, role_id)
  VALUES (v_utilisateur_id, v_role_id) ON CONFLICT DO NOTHING;

  INSERT INTO orange.participant (utilisateur_id) VALUES (v_utilisateur_id)
  ON CONFLICT (utilisateur_id) DO NOTHING
  RETURNING participant_id INTO v_participant_id;

  IF v_participant_id IS NULL THEN
    SELECT participant_id INTO v_participant_id FROM orange.participant WHERE utilisateur_id = v_utilisateur_id;
  END IF;

  INSERT INTO orange.profil_professionnel (participant_id) VALUES (v_participant_id)
  ON CONFLICT (participant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION orange.creer_utilisateur_applicatif();

CREATE OR REPLACE FUNCTION orange.sync_email_verifie()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
BEGIN
  UPDATE orange.utilisateur
  SET email_verifie = (NEW.email_confirmed_at IS NOT NULL), email = NEW.email, maj_le = now()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION orange.sync_email_verifie();

-- DONNEES DE REFERENCE
INSERT INTO orange.role (nom_role, code_role, description)
VALUES
  ('Participant','PARTICIPANT','Suit les formations et sessions'),
  ('Formateur','FORMATEUR','Anime les sessions de formation'),
  ('Responsable','RESPONSABLE','Pilote les formations et les inscriptions'),
  ('Administrateur','ADMINISTRATEUR','Administre la plateforme')
ON CONFLICT (code_role) DO NOTHING;


   -- Matrice complète des droits : 38 permissions et 106 autorisations par acteur.
-- Identique à la base hébergée. Idempotent : peut être rejoué sans doublon.

INSERT INTO orange.permission (nom, code, module) VALUES
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
INSERT INTO orange.role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM matrice m
JOIN orange.role r ON r.code_role::text = m.code_role
JOIN orange.permission p ON p.code = m.code
WHERE NOT EXISTS (
  SELECT 1 FROM orange.role_permission rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
);


-- ==================================================================================================================================



CREATE TABLE orange.categorie_formation (
  categorie_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR NOT NULL UNIQUE,
  icone VARCHAR,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON orange.categorie_formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.categorie_formation TO authenticated;
GRANT ALL ON orange.categorie_formation TO service_role;
ALTER TABLE orange.categorie_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories lecture" ON orange.categorie_formation FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "categories gestion" ON orange.categorie_formation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE orange.formation (
  formation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categorie_id BIGINT REFERENCES orange.categorie_formation(categorie_id) ON DELETE SET NULL,
  titre VARCHAR NOT NULL,
  description TEXT,
  niveau orange.niveau_formation_enum NOT NULL DEFAULT 'Débutant',
  url_image VARCHAR,
  statut orange.statut_formation_enum NOT NULL DEFAULT 'Brouillon',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON orange.formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.formation TO authenticated;
GRANT ALL ON orange.formation TO service_role;
ALTER TABLE orange.formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "formations lecture" ON orange.formation FOR SELECT TO authenticated USING (true);
CREATE POLICY "formations publiees anon" ON orange.formation FOR SELECT TO anon USING (statut = 'Publiée');
CREATE POLICY "formations gestion" ON orange.formation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE orange.session_formation (
  session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formation_id BIGINT NOT NULL REFERENCES orange.formation(formation_id) ON DELETE CASCADE,
  formateur_id BIGINT REFERENCES orange.formateur(formateur_id) ON DELETE SET NULL,
  nom_session VARCHAR NOT NULL,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  lieu VARCHAR,
  capacite INTEGER,
  statut orange.statut_session_enum NOT NULL DEFAULT 'Planifiée',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON orange.session_formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.session_formation TO authenticated;
GRANT ALL ON orange.session_formation TO service_role;
ALTER TABLE orange.session_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions lecture" ON orange.session_formation FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sessions gestion" ON orange.session_formation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE orange.inscription (
  inscription_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES orange.session_formation(session_id) ON DELETE CASCADE,
  participant_id BIGINT NOT NULL REFERENCES orange.participant(participant_id) ON DELETE CASCADE,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut orange.statut_inscription_enum NOT NULL DEFAULT 'En attente',
  motivation TEXT,
  engagement BOOLEAN NOT NULL DEFAULT false,
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, participant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.inscription TO authenticated;
GRANT ALL ON orange.inscription TO service_role;
ALTER TABLE orange.inscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscription lecture" ON orange.inscription FOR SELECT TO authenticated USING (
  participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id())
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE') OR orange.a_role(auth.uid(), 'FORMATEUR')
);
CREATE POLICY "inscription creation" ON orange.inscription FOR INSERT TO authenticated WITH CHECK (
  participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id())
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
);
CREATE POLICY "inscription maj" ON orange.inscription FOR UPDATE TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));
CREATE POLICY "inscription suppression" ON orange.inscription FOR DELETE TO authenticated USING (
  participant_id IN (SELECT participant_id FROM orange.participant WHERE utilisateur_id = orange.utilisateur_courant_id())
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
);

CREATE TABLE orange.presence (
  presence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id BIGINT NOT NULL REFERENCES orange.inscription(inscription_id) ON DELETE CASCADE,
  date_presence DATE NOT NULL DEFAULT CURRENT_DATE,
  present BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (inscription_id, date_presence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.presence TO authenticated;
GRANT ALL ON orange.presence TO service_role;
ALTER TABLE orange.presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence lecture" ON orange.presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence gestion" ON orange.presence FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE') OR orange.a_role(auth.uid(), 'FORMATEUR'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE') OR orange.a_role(auth.uid(), 'FORMATEUR'));



CREATE TABLE orange.attestation (
  attestation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id BIGINT NOT NULL UNIQUE REFERENCES orange.inscription(inscription_id) ON DELETE CASCADE,
  numero_attestation VARCHAR(30) NOT NULL UNIQUE,
  jeton_verification VARCHAR(255) NOT NULL UNIQUE,
  statut orange.statut_attestation_enum NOT NULL DEFAULT 'Valide',
  delivree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON orange.attestation TO authenticated;
GRANT ALL ON orange.attestation TO service_role;
ALTER TABLE orange.attestation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attestation lecture" ON orange.attestation FOR SELECT TO authenticated USING (
  inscription_id IN (
    SELECT i.inscription_id FROM orange.inscription i
    JOIN orange.participant p ON p.participant_id = i.participant_id
    WHERE p.utilisateur_id = orange.utilisateur_courant_id()
  )
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR')
);
CREATE POLICY "attestation gestion" ON orange.attestation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "attestation insertion"
ON orange.attestation FOR INSERT TO authenticated
WITH CHECK (
  inscription_id IN ( SELECT i.inscription_id FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
   WHERE p.utilisateur_id = orange.utilisateur_courant_id())
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE TABLE orange.evenement (
  evenement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titre VARCHAR NOT NULL,
  type_evenement orange.type_evenement_enum NOT NULL DEFAULT 'Autre',
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  lieu VARCHAR,
  statut orange.statut_evenement_enum NOT NULL DEFAULT 'Planifié',
  description TEXT,
  cree_par BIGINT REFERENCES orange.utilisateur(utilisateur_id) ON DELETE SET NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.evenement TO authenticated;
GRANT ALL ON orange.evenement TO service_role;
ALTER TABLE orange.evenement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evenement lecture" ON orange.evenement FOR SELECT TO authenticated USING (true);
CREATE POLICY "evenement creation" ON orange.evenement FOR INSERT TO authenticated WITH CHECK (
  cree_par = orange.utilisateur_courant_id()
  OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
);
CREATE POLICY "evenement maj" ON orange.evenement FOR UPDATE TO authenticated
  USING (cree_par = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (cree_par = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));
CREATE POLICY "evenement suppression" ON orange.evenement FOR DELETE TO authenticated USING (
  cree_par = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
);

CREATE TABLE orange.publication (
  publication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auteur_id BIGINT REFERENCES orange.utilisateur(utilisateur_id) ON DELETE SET NULL,
  titre VARCHAR NOT NULL,
  contenu TEXT,
  publie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.publication TO authenticated;
GRANT ALL ON orange.publication TO service_role;
ALTER TABLE orange.publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publication lecture" ON orange.publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "publication gestion" ON orange.publication FOR ALL TO authenticated
  USING (auteur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (auteur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE orange.media_publication (
  media_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id BIGINT NOT NULL REFERENCES orange.publication(publication_id) ON DELETE CASCADE,
  url_media VARCHAR NOT NULL,
  type_media orange.type_media_enum NOT NULL DEFAULT 'Image'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.media_publication TO authenticated;
GRANT ALL ON orange.media_publication TO service_role;
ALTER TABLE orange.media_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media lecture" ON orange.media_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "media gestion" ON orange.media_publication FOR ALL TO authenticated
  USING (publication_id IN (SELECT publication_id FROM orange.publication WHERE auteur_id = orange.utilisateur_courant_id())
    OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
  WITH CHECK (publication_id IN (SELECT publication_id FROM orange.publication WHERE auteur_id = orange.utilisateur_courant_id())
    OR orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE TABLE orange.support_formation (
  support_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formation_id BIGINT NOT NULL REFERENCES orange.formation(formation_id) ON DELETE CASCADE,
  titre VARCHAR NOT NULL,
  url_fichier VARCHAR NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.support_formation TO authenticated;
GRANT ALL ON orange.support_formation TO service_role;
ALTER TABLE orange.support_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support lecture" ON orange.support_formation FOR SELECT TO authenticated USING (true);
CREATE POLICY "support gestion" ON orange.support_formation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE') OR orange.a_role(auth.uid(), 'FORMATEUR'))
  WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE') OR orange.a_role(auth.uid(), 'FORMATEUR'));

CREATE INDEX idx_session_formation_formation ON orange.session_formation(formation_id);
CREATE INDEX idx_inscription_session ON orange.inscription(session_id);
CREATE INDEX idx_inscription_participant ON orange.inscription(participant_id);
CREATE INDEX idx_evenement_debut ON orange.evenement(date_debut);






-- =========================================================================================================






CREATE OR REPLACE FUNCTION orange.creer_utilisateur_applicatif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'orange'
AS $function$
DECLARE
  v_utilisateur_id BIGINT;
  v_role_id BIGINT;
  v_participant_id BIGINT;
  v_admin_existe BOOLEAN;
BEGIN
  INSERT INTO orange.utilisateur (auth_user_id, nom, prenoms, email, telephone, url_profil, email_verifie)
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
    SELECT utilisateur_id INTO v_utilisateur_id FROM orange.utilisateur WHERE auth_user_id = NEW.id;
  END IF;

  SELECT role_id INTO v_role_id FROM orange.role WHERE code_role = 'PARTICIPANT';
  INSERT INTO orange.role_utilisateur (utilisateur_id, role_id)
  VALUES (v_utilisateur_id, v_role_id) ON CONFLICT DO NOTHING;

  INSERT INTO orange.participant (utilisateur_id) VALUES (v_utilisateur_id)
  ON CONFLICT (utilisateur_id) DO NOTHING
  RETURNING participant_id INTO v_participant_id;

  IF v_participant_id IS NULL THEN
    SELECT participant_id INTO v_participant_id FROM orange.participant WHERE utilisateur_id = v_utilisateur_id;
  END IF;

  INSERT INTO orange.profil_professionnel (participant_id) VALUES (v_participant_id)
  ON CONFLICT (participant_id) DO NOTHING;

  -- Le tout premier compte créé devient administrateur de la plateforme
  SELECT EXISTS (SELECT 1 FROM orange.administrateur) INTO v_admin_existe;
  IF NOT v_admin_existe THEN
    SELECT role_id INTO v_role_id FROM orange.role WHERE code_role = 'ADMINISTRATEUR';
    INSERT INTO orange.role_utilisateur (utilisateur_id, role_id)
    VALUES (v_utilisateur_id, v_role_id) ON CONFLICT DO NOTHING;
    INSERT INTO orange.administrateur (utilisateur_id, service, intitule_poste)
    VALUES (v_utilisateur_id, 'Orange Digital Center', 'Administrateur');
  END IF;

  RETURN NEW;
END;
$function$;




-- ========================================================================================================




-- ENUMS


-- PRESENCE : statut, méthode, remarque
ALTER TABLE orange.presence ADD COLUMN statut orange.statut_presence_enum NOT NULL DEFAULT 'Présent';
ALTER TABLE orange.presence ADD COLUMN methode orange.methode_presence_enum NOT NULL DEFAULT 'Manuel';
ALTER TABLE orange.presence ADD COLUMN remarque text;
ALTER TABLE orange.presence ADD COLUMN enregistre_le timestamptz NOT NULL DEFAULT now();
UPDATE orange.presence SET statut = CASE WHEN present THEN 'Présent'::orange.statut_presence_enum ELSE 'Absent'::orange.statut_presence_enum END;

-- ATTESTATION
UPDATE orange.attestation SET numero_attestation = 'ATT-' || lpad(attestation_id::text, 6, '0'),
  jeton_verification = replace(gen_random_uuid()::text, '-', '') WHERE numero_attestation IS NULL;

-- PUBLICATION
ALTER TABLE orange.publication ADD COLUMN statut orange.statut_publication_enum NOT NULL DEFAULT 'Publiée';
ALTER TABLE orange.publication ADD COLUMN visibilite orange.visibilite_publication_enum NOT NULL DEFAULT 'Public';
ALTER TABLE orange.media_publication ADD COLUMN nom_fichier varchar;
ALTER TABLE orange.media_publication ADD COLUMN taille_fichier bigint;

-- EVALUATION
CREATE TABLE orange.evaluation (
  evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id bigint NOT NULL REFERENCES orange.session_formation(session_id) ON DELETE CASCADE,
  titre_evaluation varchar NOT NULL,
  date_publication timestamptz,
  date_fermeture timestamptz,
  duree_minutes integer NOT NULL DEFAULT 30,
  max_tentatives integer NOT NULL DEFAULT 1,
  score_reussite numeric NOT NULL DEFAULT 50,
  statut orange.statut_evaluation_enum NOT NULL DEFAULT 'Brouillon',
  cree_par bigint REFERENCES orange.utilisateur(utilisateur_id),
  cree_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.evaluation TO authenticated;
GRANT ALL ON orange.evaluation TO service_role;
ALTER TABLE orange.evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture evaluation" ON orange.evaluation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion evaluation" ON orange.evaluation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE orange.question_evaluation (
  question_evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evaluation_id bigint NOT NULL REFERENCES orange.evaluation(evaluation_id) ON DELETE CASCADE,
  texte_question text NOT NULL,
  type_question orange.type_question_enum NOT NULL DEFAULT 'Choix unique',
  ordre_question integer NOT NULL DEFAULT 1,
  points numeric NOT NULL DEFAULT 1,
  est_requis boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.question_evaluation TO authenticated;
GRANT ALL ON orange.question_evaluation TO service_role;
ALTER TABLE orange.question_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture questions" ON orange.question_evaluation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion questions" ON orange.question_evaluation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE orange.option_question (
  option_question_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_evaluation_id bigint NOT NULL REFERENCES orange.question_evaluation(question_evaluation_id) ON DELETE CASCADE,
  texte_option varchar NOT NULL,
  est_correct boolean NOT NULL DEFAULT false,
  ordre_option integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.option_question TO authenticated;
GRANT ALL ON orange.option_question TO service_role;
ALTER TABLE orange.option_question ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture options" ON orange.option_question FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion options" ON orange.option_question FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'))
  WITH CHECK (orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR'));

CREATE TABLE orange.tentative_evaluation (
  tentative_evaluation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evaluation_id bigint NOT NULL REFERENCES orange.evaluation(evaluation_id) ON DELETE CASCADE,
  inscription_id bigint NOT NULL REFERENCES orange.inscription(inscription_id) ON DELETE CASCADE,
  numero_tentative integer NOT NULL DEFAULT 1,
  commence_le timestamptz NOT NULL DEFAULT now(),
  soumis_le timestamptz,
  score numeric,
  statut orange.statut_tentative_enum NOT NULL DEFAULT 'En cours',
  reussi boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.tentative_evaluation TO authenticated;
GRANT ALL ON orange.tentative_evaluation TO service_role;
ALTER TABLE orange.tentative_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture tentatives" ON orange.tentative_evaluation FOR SELECT TO authenticated USING (
  orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (SELECT 1 FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
             WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = orange.utilisateur_courant_id())
);
CREATE POLICY "Ecriture tentatives" ON orange.tentative_evaluation FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
          WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = orange.utilisateur_courant_id())
);
CREATE POLICY "Maj tentatives" ON orange.tentative_evaluation FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
          WHERE i.inscription_id = tentative_evaluation.inscription_id AND p.utilisateur_id = orange.utilisateur_courant_id())
);

CREATE TABLE orange.reponse_participant (
  reponse_participant_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tentative_evaluation_id bigint NOT NULL REFERENCES orange.tentative_evaluation(tentative_evaluation_id) ON DELETE CASCADE,
  question_evaluation_id bigint NOT NULL REFERENCES orange.question_evaluation(question_evaluation_id) ON DELETE CASCADE,
  option_question_id bigint REFERENCES orange.option_question(option_question_id) ON DELETE CASCADE,
  est_correct boolean NOT NULL DEFAULT false,
  points_gagnes numeric NOT NULL DEFAULT 0,
  repondu_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.reponse_participant TO authenticated;
GRANT ALL ON orange.reponse_participant TO service_role;
ALTER TABLE orange.reponse_participant ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture reponses" ON orange.reponse_participant FOR SELECT TO authenticated USING (
  orange.a_role(auth.uid(),'FORMATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE') OR orange.a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (SELECT 1 FROM orange.tentative_evaluation t JOIN orange.inscription i ON i.inscription_id = t.inscription_id
             JOIN orange.participant p ON p.participant_id = i.participant_id
             WHERE t.tentative_evaluation_id = reponse_participant.tentative_evaluation_id AND p.utilisateur_id = orange.utilisateur_courant_id())
);
CREATE POLICY "Ecriture reponses" ON orange.reponse_participant FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM orange.tentative_evaluation t JOIN orange.inscription i ON i.inscription_id = t.inscription_id
          JOIN orange.participant p ON p.participant_id = i.participant_id
          WHERE t.tentative_evaluation_id = reponse_participant.tentative_evaluation_id AND p.utilisateur_id = orange.utilisateur_courant_id())
);

CREATE TABLE orange.commentaire_publication (
  commentaire_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id bigint NOT NULL REFERENCES orange.publication(publication_id) ON DELETE CASCADE,
  utilisateur_id bigint NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  contenu text NOT NULL,
  statut orange.statut_commentaire_enum NOT NULL DEFAULT 'Visible',
  cree_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.commentaire_publication TO authenticated;
GRANT ALL ON orange.commentaire_publication TO service_role;
ALTER TABLE orange.commentaire_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture commentaires" ON orange.commentaire_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ecriture commentaires" ON orange.commentaire_publication FOR INSERT TO authenticated
  WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());
CREATE POLICY "Maj commentaires" ON orange.commentaire_publication FOR UPDATE TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));
CREATE POLICY "Suppression commentaires" ON orange.commentaire_publication FOR DELETE TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id() OR orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));

CREATE TABLE orange.reaction_publication (
  reaction_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication_id bigint NOT NULL REFERENCES orange.publication(publication_id) ON DELETE CASCADE,
  utilisateur_id bigint NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_reaction orange.type_reaction_enum NOT NULL DEFAULT 'J''aime',
  cree_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, utilisateur_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.reaction_publication TO authenticated;
GRANT ALL ON orange.reaction_publication TO service_role;
ALTER TABLE orange.reaction_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture reactions" ON orange.reaction_publication FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion reactions" ON orange.reaction_publication FOR ALL TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());

CREATE TABLE orange.modele_attestation (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.modele_attestation TO authenticated;
GRANT ALL ON orange.modele_attestation TO service_role;
ALTER TABLE orange.modele_attestation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture modele" ON orange.modele_attestation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion modele" ON orange.modele_attestation FOR ALL TO authenticated
  USING (orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'))
  WITH CHECK (orange.a_role(auth.uid(),'ADMINISTRATEUR') OR orange.a_role(auth.uid(),'RESPONSABLE'));

CREATE INDEX idx_question_evaluation ON orange.question_evaluation(evaluation_id);
CREATE INDEX idx_option_question ON orange.option_question(question_evaluation_id);
CREATE INDEX idx_tentative_evaluation ON orange.tentative_evaluation(evaluation_id);
CREATE INDEX idx_commentaire_publication ON orange.commentaire_publication(publication_id);
CREATE INDEX idx_reaction_publication ON orange.reaction_publication(publication_id);





-- ====================================================================================================================






CREATE TABLE orange.conversation_ia (
  conversation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  titre TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orange.message_ia (
  message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES orange.conversation_ia(conversation_id) ON DELETE CASCADE,
  role_message TEXT NOT NULL,
  contenu TEXT NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orange.retour_ia (
  retour_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES orange.message_ia(message_id) ON DELETE CASCADE,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_retour orange.type_retour_ia_enum NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, utilisateur_id)
);

CREATE INDEX idx_conversation_ia_utilisateur ON orange.conversation_ia(utilisateur_id);
CREATE INDEX idx_message_ia_conversation ON orange.message_ia(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON orange.conversation_ia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.message_ia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orange.retour_ia TO authenticated;
GRANT ALL ON orange.conversation_ia TO service_role;
GRANT ALL ON orange.message_ia TO service_role;
GRANT ALL ON orange.retour_ia TO service_role;

ALTER TABLE orange.conversation_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE orange.message_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE orange.retour_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_ia proprietaire" ON orange.conversation_ia
  FOR ALL TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());

CREATE POLICY "message_ia proprietaire" ON orange.message_ia
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM orange.conversation_ia c WHERE c.conversation_id = message_ia.conversation_id AND c.utilisateur_id = orange.utilisateur_courant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM orange.conversation_ia c WHERE c.conversation_id = message_ia.conversation_id AND c.utilisateur_id = orange.utilisateur_courant_id()));

CREATE POLICY "retour_ia proprietaire" ON orange.retour_ia
  FOR ALL TO authenticated
  USING (utilisateur_id = orange.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());




-- =============================================================================================================




CREATE POLICY "fichiers_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fichiers');

CREATE POLICY "fichiers_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fichiers' AND owner = auth.uid());

CREATE POLICY "fichiers_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fichiers' AND owner = auth.uid())
WITH CHECK (bucket_id = 'fichiers' AND owner = auth.uid());

CREATE POLICY "fichiers_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fichiers' AND owner = auth.uid());


-- ==============================================================================================




-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE orange.statut_paiement_enum AS ENUM ('En attente', 'Payé', 'Annulé');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE orange.methode_paiement_enum AS ENUM ('Espèces', 'Mobile Money', 'Virement', 'Chèque');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE orange.type_notification_enum AS ENUM (
    'INSCRIPTION','FORMATION','SESSION','PRESENCE','EVALUATION','ATTESTATION',
    'AGENDA','PUBLICATION','PAIEMENT','ADMINISTRATION','SYSTEME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PAIEMENT FORMATEUR ============
CREATE TABLE IF NOT EXISTS orange.paiement_formateur (
  paiement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formateur_id BIGINT NOT NULL REFERENCES orange.formateur(formateur_id) ON DELETE CASCADE,
  session_id BIGINT REFERENCES orange.session_formation(session_id) ON DELETE SET NULL,
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  methode orange.methode_paiement_enum NOT NULL DEFAULT 'Virement',
  ref VARCHAR(20),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  statut orange.statut_paiement_enum NOT NULL DEFAULT 'En attente',
  remarque TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON orange.paiement_formateur TO authenticated;
GRANT ALL ON orange.paiement_formateur TO service_role;
ALTER TABLE orange.paiement_formateur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paiement lecture" ON orange.paiement_formateur FOR SELECT TO authenticated
USING (
  orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
  OR formateur_id IN (SELECT f.formateur_id FROM orange.formateur f WHERE f.utilisateur_id = orange.utilisateur_courant_id())
);
CREATE POLICY "paiement gestion" ON orange.paiement_formateur FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE INDEX IF NOT EXISTS idx_paiement_formateur_formateur ON orange.paiement_formateur(formateur_id);

-- ============ NOTIFICATION ============
CREATE TABLE IF NOT EXISTS orange.notification (
  notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES orange.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_notification orange.type_notification_enum NOT NULL DEFAULT 'SYSTEME',
  titre VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  lien VARCHAR(100),
  lu BOOLEAN NOT NULL DEFAULT false,
  lu_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON orange.notification TO authenticated;
GRANT ALL ON orange.notification TO service_role;
ALTER TABLE orange.notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification lecture proprietaire" ON orange.notification FOR SELECT TO authenticated
USING (utilisateur_id = orange.utilisateur_courant_id());
CREATE POLICY "notification maj proprietaire" ON orange.notification FOR UPDATE TO authenticated
USING (utilisateur_id = orange.utilisateur_courant_id())
WITH CHECK (utilisateur_id = orange.utilisateur_courant_id());
CREATE POLICY "notification suppression proprietaire" ON orange.notification FOR DELETE TO authenticated
USING (utilisateur_id = orange.utilisateur_courant_id());
CREATE POLICY "notification insertion admin" ON orange.notification FOR INSERT TO authenticated
WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE INDEX IF NOT EXISTS idx_notification_utilisateur ON orange.notification(utilisateur_id, lu, cree_le DESC);

-- ============ HELPER ============
CREATE OR REPLACE FUNCTION orange.creer_notification(
  _utilisateur_id BIGINT, _type orange.type_notification_enum,
  _titre VARCHAR, _message TEXT, _lien VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
BEGIN
  IF _utilisateur_id IS NULL THEN RETURN; END IF;
  INSERT INTO orange.notification (utilisateur_id, type_notification, titre, message, lien)
  VALUES (_utilisateur_id, _type, _titre, _message, _lien);
END $$;

CREATE OR REPLACE FUNCTION orange.notifier_gestionnaires(
  _type orange.type_notification_enum, _titre VARCHAR, _message TEXT, _lien VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
BEGIN
  INSERT INTO orange.notification (utilisateur_id, type_notification, titre, message, lien)
  SELECT ru.utilisateur_id, _type, _titre, _message, _lien
  FROM orange.role_utilisateur ru
  JOIN orange.role r ON r.role_id = ru.role_id
  WHERE r.code_role IN ('ADMINISTRATEUR', 'RESPONSABLE');
END $$;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION orange.notif_inscription() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
DECLARE u_id BIGINT; titre_formation TEXT; nom_complet TEXT;
BEGIN
  SELECT p.utilisateur_id, (us.prenoms || ' ' || us.nom) INTO u_id, nom_complet
  FROM orange.participant p JOIN orange.utilisateur us ON us.utilisateur_id = p.utilisateur_id
  WHERE p.participant_id = NEW.participant_id;
  SELECT f.titre INTO titre_formation
  FROM orange.session_formation s JOIN orange.formation f ON f.formation_id = s.formation_id
  WHERE s.session_id = NEW.session_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM orange.creer_notification(u_id, 'INSCRIPTION', 'Demande d''inscription envoyée',
      'Votre demande d''inscription à la formation ' || COALESCE(titre_formation, '') || ' a été envoyée.', '/catalogue');
    PERFORM orange.notifier_gestionnaires('INSCRIPTION', 'Nouvelle demande d''inscription',
      COALESCE(nom_complet, 'Un participant') || ' souhaite s''inscrire à ' || COALESCE(titre_formation, 'une formation') || '.', '/inscriptions');
  ELSIF NEW.statut IS DISTINCT FROM OLD.statut THEN
    PERFORM orange.creer_notification(u_id, 'INSCRIPTION', 'Inscription ' || lower(NEW.statut::text),
      'Votre inscription à la formation ' || COALESCE(titre_formation, '') || ' est désormais : ' || NEW.statut::text || '.', '/catalogue');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_inscription ON orange.inscription;
CREATE TRIGGER trg_notif_inscription AFTER INSERT OR UPDATE OF statut ON orange.inscription
FOR EACH ROW EXECUTE FUNCTION orange.notif_inscription();

CREATE OR REPLACE FUNCTION orange.notif_attestation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT p.utilisateur_id INTO u_id
  FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
  WHERE i.inscription_id = NEW.inscription_id;
  PERFORM orange.creer_notification(u_id, 'ATTESTATION', 'Attestation disponible',
    'Félicitations ! Votre attestation de formation est disponible dans le menu Mes attestations.', '/attestations');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_attestation ON orange.attestation;
CREATE TRIGGER trg_notif_attestation AFTER INSERT ON orange.attestation
FOR EACH ROW EXECUTE FUNCTION orange.notif_attestation();

CREATE OR REPLACE FUNCTION orange.notif_evaluation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
BEGIN
  IF NEW.statut = 'Publiée' AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'Publiée') THEN
    INSERT INTO orange.notification (utilisateur_id, type_notification, titre, message, lien)
    SELECT p.utilisateur_id, 'EVALUATION', 'Nouvelle évaluation disponible',
      'L''évaluation « ' || NEW.titre_evaluation || ' » est maintenant disponible.', '/evaluations/mes-evaluations'
    FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
    WHERE i.session_id = NEW.session_id AND i.statut = 'Acceptée';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_evaluation ON orange.evaluation;
CREATE TRIGGER trg_notif_evaluation AFTER INSERT OR UPDATE OF statut ON orange.evaluation
FOR EACH ROW EXECUTE FUNCTION orange.notif_evaluation();

CREATE OR REPLACE FUNCTION orange.notif_paiement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT f.utilisateur_id INTO u_id FROM orange.formateur f WHERE f.formateur_id = NEW.formateur_id;
  PERFORM orange.creer_notification(u_id, 'PAIEMENT', 'Paiement ' || lower(NEW.statut::text),
    'Un paiement de ' || NEW.montant::text || ' a été enregistré avec le statut ' || NEW.statut::text || '.', '/formateurs');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_paiement ON orange.paiement_formateur;
CREATE TRIGGER trg_notif_paiement AFTER INSERT OR UPDATE OF statut ON orange.paiement_formateur
FOR EACH ROW EXECUTE FUNCTION orange.notif_paiement();

CREATE OR REPLACE FUNCTION orange.notif_presence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT p.utilisateur_id INTO u_id
  FROM orange.inscription i JOIN orange.participant p ON p.participant_id = i.participant_id
  WHERE i.inscription_id = NEW.inscription_id;
  PERFORM orange.creer_notification(u_id, 'PRESENCE', 'Présence enregistrée',
    'Votre présence du ' || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' est enregistrée : ' || NEW.statut::text || '.', '/presence');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_presence ON orange.presence;
CREATE TRIGGER trg_notif_presence AFTER INSERT OR UPDATE OF statut ON orange.presence
FOR EACH ROW EXECUTE FUNCTION orange.notif_presence();

CREATE OR REPLACE FUNCTION orange.notif_evenement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = orange AS $$
BEGIN
  IF NEW.statut IN ('Planifié', 'En cours', 'Annulé') THEN
    PERFORM orange.notifier_gestionnaires('AGENDA', 'Agenda : ' || NEW.titre,
      'Événement ' || NEW.type_evenement::text || ' — statut ' || NEW.statut::text || ' le ' || to_char( NEW.date_debut AT TIME ZONE 'Indian/Antananarivo','DD/MM/YYYY HH24:MI') || '.', '/agenda');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_evenement ON orange.evenement;
CREATE TRIGGER trg_notif_evenement AFTER INSERT OR UPDATE OF statut ON orange.evenement
FOR EACH ROW EXECUTE FUNCTION orange.notif_evenement();

-- ============ POLITIQUES ADMINISTRATION ============
CREATE POLICY "utilisateur gestion admin" ON orange.utilisateur FOR UPDATE TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "formateur gestion admin" ON orange.formateur FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "participant gestion admin" ON orange.participant FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "profil pro gestion admin" ON orange.profil_professionnel FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "responsable gestion admin" ON orange.responsable FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "roles utilisateur gestion admin" ON orange.role_utilisateur FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "role permission gestion admin" ON orange.role_permission FOR ALL TO authenticated
USING (orange.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (orange.a_role(auth.uid(), 'ADMINISTRATEUR'));




-- ====================================================================================================




ALTER TABLE orange.notification REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'orange' AND tablename = 'notification'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE orange.notification';
  END IF;
END $$;





CREATE OR REPLACE FUNCTION orange.notif_presence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'orange'
AS $function$
DECLARE
  u_id BIGINT;
  nom_complet TEXT;
  nom_session TEXT;
BEGIN
  SELECT p.utilisateur_id, (us.prenoms || ' ' || us.nom), s.nom_session
    INTO u_id, nom_complet, nom_session
  FROM orange.inscription i
  JOIN orange.participant p ON p.participant_id = i.participant_id
  JOIN orange.utilisateur us ON us.utilisateur_id = p.utilisateur_id
  JOIN orange.session_formation s ON s.session_id = i.session_id
  WHERE i.inscription_id = NEW.inscription_id;

  PERFORM orange.creer_notification(u_id, 'PRESENCE', 'Présence enregistrée',
    'Votre présence du ' || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' est enregistrée : ' || NEW.statut::text || '.', '/presence');

  PERFORM orange.notifier_gestionnaires('PRESENCE', 'Présence ' || lower(NEW.statut::text) || ' enregistrée',
    COALESCE(nom_complet, 'Un participant') || ' — ' || COALESCE(nom_session, 'session') || ' le '
    || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' (' || NEW.methode::text || ').', '/presence');

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION orange.notif_paiement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'orange'
AS $function$
DECLARE
  u_id BIGINT;
  nom_complet TEXT;
BEGIN
  SELECT f.utilisateur_id, (u.prenoms || ' ' || u.nom) INTO u_id, nom_complet
  FROM orange.formateur f JOIN orange.utilisateur u ON u.utilisateur_id = f.utilisateur_id
  WHERE f.formateur_id = NEW.formateur_id;

  PERFORM orange.creer_notification(u_id, 'PAIEMENT', 'Paiement ' || lower(NEW.statut::text),
    'Un paiement de ' || NEW.montant::text || ' a été enregistré avec le statut ' || NEW.statut::text || '.', '/paiements-formateurs');

  PERFORM orange.notifier_gestionnaires('PAIEMENT', 'Paiement formateur ' || lower(NEW.statut::text),
    COALESCE(nom_complet, 'Formateur') || ' — ' || NEW.montant::text || ' (' || NEW.methode::text || ').', '/paiements-formateurs');

  RETURN NEW;
END $function$;




-- ======================================================================================================================





ALTER TABLE orange.support_formation
  ADD COLUMN IF NOT EXISTS session_id BIGINT REFERENCES orange.session_formation(session_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS nom_fichier VARCHAR,
  ADD COLUMN IF NOT EXISTS taille_fichier BIGINT,
  ADD COLUMN IF NOT EXISTS type_support VARCHAR,
  ADD COLUMN IF NOT EXISTS cree_par BIGINT REFERENCES orange.utilisateur(utilisateur_id);

CREATE INDEX IF NOT EXISTS idx_support_session ON orange.support_formation(session_id);

DROP POLICY IF EXISTS "support lecture" ON orange.support_formation;
DROP POLICY IF EXISTS "support gestion" ON orange.support_formation;

-- Lecture : gestionnaires, formateur de la session, participant accepté de la session
CREATE POLICY "support lecture autorisee" ON orange.support_formation
FOR SELECT TO authenticated
USING (
  orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM orange.session_formation s
    JOIN orange.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = orange.utilisateur_courant_id()
  )
  OR EXISTS (
    SELECT 1 FROM orange.inscription i
    JOIN orange.participant p ON p.participant_id = i.participant_id
    WHERE i.session_id = support_formation.session_id
      AND i.statut = 'Acceptée'
      AND p.utilisateur_id = orange.utilisateur_courant_id()
  )
);

-- Gestion : admin, responsable, ou formateur affecté à la session
CREATE POLICY "support gestion autorisee" ON orange.support_formation
FOR ALL TO authenticated
USING (
  orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM orange.session_formation s
    JOIN orange.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = orange.utilisateur_courant_id()
  )
)
WITH CHECK (
  orange.a_role(auth.uid(), 'ADMINISTRATEUR') OR orange.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM orange.session_formation s
    JOIN orange.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = orange.utilisateur_courant_id()
  )
);

-- ======================================================================================

CREATE OR REPLACE FUNCTION orange.peut_voir_evaluation(_evaluation_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'orange' AS $$
  SELECT a_role(auth.uid(),'FORMATEUR') OR a_role(auth.uid(),'RESPONSABLE') OR a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (
    SELECT 1 FROM evaluation e
    JOIN inscription i ON i.session_id = e.session_id AND i.statut = 'Acceptée'
    JOIN participant p ON p.participant_id = i.participant_id
    WHERE e.evaluation_id = _evaluation_id AND e.statut IN ('Publiée','Fermée')
      AND p.utilisateur_id = utilisateur_courant_id()
  );
$$;

DROP POLICY IF EXISTS "Lecture evaluation" ON orange.evaluation;
CREATE POLICY "Lecture evaluation" ON orange.evaluation FOR SELECT TO authenticated
  USING (orange.peut_voir_evaluation(evaluation_id));

DROP POLICY IF EXISTS "Lecture questions" ON orange.question_evaluation;
CREATE POLICY "Lecture questions" ON orange.question_evaluation FOR SELECT TO authenticated
  USING (orange.peut_voir_evaluation(evaluation_id));

DROP POLICY IF EXISTS "Lecture options" ON orange.option_question;
CREATE POLICY "Lecture options" ON orange.option_question FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orange.question_evaluation q WHERE q.question_evaluation_id = option_question.question_evaluation_id AND orange.peut_voir_evaluation(q.evaluation_id)));

ALTER TABLE orange.paiement_formateur ADD COLUMN IF NOT EXISTS valide_par bigint REFERENCES orange.responsable(responsable_id) ON DELETE SET NULL;