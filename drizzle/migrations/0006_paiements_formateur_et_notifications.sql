-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.statut_paiement_enum AS ENUM ('En attente', 'Payé', 'Annulé');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.methode_paiement_enum AS ENUM ('Espèces', 'Mobile Money', 'Virement', 'Chèque');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.type_notification_enum AS ENUM (
    'INSCRIPTION','FORMATION','SESSION','PRESENCE','EVALUATION','ATTESTATION',
    'AGENDA','PUBLICATION','PAIEMENT','ADMINISTRATION','SYSTEME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PAIEMENT FORMATEUR ============
CREATE TABLE IF NOT EXISTS public.paiement_formateur (
  paiement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formateur_id BIGINT NOT NULL REFERENCES public.formateur(formateur_id) ON DELETE CASCADE,
  session_id BIGINT REFERENCES public.session_formation(session_id) ON DELETE SET NULL,
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  methode public.methode_paiement_enum NOT NULL DEFAULT 'Virement',
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  statut public.statut_paiement_enum NOT NULL DEFAULT 'En attente',
  remarque TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paiement_formateur TO authenticated;
GRANT ALL ON public.paiement_formateur TO service_role;
ALTER TABLE public.paiement_formateur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paiement lecture" ON public.paiement_formateur FOR SELECT TO authenticated
USING (
  public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
  OR formateur_id IN (SELECT f.formateur_id FROM public.formateur f WHERE f.utilisateur_id = public.utilisateur_courant_id())
);
CREATE POLICY "paiement gestion" ON public.paiement_formateur FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE INDEX IF NOT EXISTS idx_paiement_formateur_formateur ON public.paiement_formateur(formateur_id);

-- ============ NOTIFICATION ============
CREATE TABLE IF NOT EXISTS public.notification (
  notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_notification public.type_notification_enum NOT NULL DEFAULT 'SYSTEME',
  titre VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  lien VARCHAR(300),
  lu BOOLEAN NOT NULL DEFAULT false,
  lu_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification TO authenticated;
GRANT ALL ON public.notification TO service_role;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification lecture proprietaire" ON public.notification FOR SELECT TO authenticated
USING (utilisateur_id = public.utilisateur_courant_id());
CREATE POLICY "notification maj proprietaire" ON public.notification FOR UPDATE TO authenticated
USING (utilisateur_id = public.utilisateur_courant_id())
WITH CHECK (utilisateur_id = public.utilisateur_courant_id());
CREATE POLICY "notification suppression proprietaire" ON public.notification FOR DELETE TO authenticated
USING (utilisateur_id = public.utilisateur_courant_id());
CREATE POLICY "notification insertion admin" ON public.notification FOR INSERT TO authenticated
WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE INDEX IF NOT EXISTS idx_notification_utilisateur ON public.notification(utilisateur_id, lu, cree_le DESC);

-- ============ HELPER ============
CREATE OR REPLACE FUNCTION public.creer_notification(
  _utilisateur_id BIGINT, _type public.type_notification_enum,
  _titre VARCHAR, _message TEXT, _lien VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _utilisateur_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notification (utilisateur_id, type_notification, titre, message, lien)
  VALUES (_utilisateur_id, _type, _titre, _message, _lien);
END $$;

CREATE OR REPLACE FUNCTION public.notifier_gestionnaires(
  _type public.type_notification_enum, _titre VARCHAR, _message TEXT, _lien VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification (utilisateur_id, type_notification, titre, message, lien)
  SELECT ru.utilisateur_id, _type, _titre, _message, _lien
  FROM public.role_utilisateur ru
  JOIN public.role r ON r.role_id = ru.role_id
  WHERE r.code_role IN ('ADMINISTRATEUR', 'RESPONSABLE');
END $$;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notif_inscription() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u_id BIGINT; titre_formation TEXT; nom_complet TEXT;
BEGIN
  SELECT p.utilisateur_id, (us.prenoms || ' ' || us.nom) INTO u_id, nom_complet
  FROM public.participant p JOIN public.utilisateur us ON us.utilisateur_id = p.utilisateur_id
  WHERE p.participant_id = NEW.participant_id;
  SELECT f.titre INTO titre_formation
  FROM public.session_formation s JOIN public.formation f ON f.formation_id = s.formation_id
  WHERE s.session_id = NEW.session_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.creer_notification(u_id, 'INSCRIPTION', 'Demande d''inscription envoyée',
      'Votre demande d''inscription à la formation ' || COALESCE(titre_formation, '') || ' a été envoyée.', '/catalogue');
    PERFORM public.notifier_gestionnaires('INSCRIPTION', 'Nouvelle demande d''inscription',
      COALESCE(nom_complet, 'Un participant') || ' souhaite s''inscrire à ' || COALESCE(titre_formation, 'une formation') || '.', '/inscriptions');
  ELSIF NEW.statut IS DISTINCT FROM OLD.statut THEN
    PERFORM public.creer_notification(u_id, 'INSCRIPTION', 'Inscription ' || lower(NEW.statut::text),
      'Votre inscription à la formation ' || COALESCE(titre_formation, '') || ' est désormais : ' || NEW.statut::text || '.', '/catalogue');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_inscription ON public.inscription;
CREATE TRIGGER trg_notif_inscription AFTER INSERT OR UPDATE OF statut ON public.inscription
FOR EACH ROW EXECUTE FUNCTION public.notif_inscription();

CREATE OR REPLACE FUNCTION public.notif_attestation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT p.utilisateur_id INTO u_id
  FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
  WHERE i.inscription_id = NEW.inscription_id;
  PERFORM public.creer_notification(u_id, 'ATTESTATION', 'Attestation disponible',
    'Félicitations ! Votre attestation de formation est disponible dans le menu Mes attestations.', '/attestations');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_attestation ON public.attestation;
CREATE TRIGGER trg_notif_attestation AFTER INSERT ON public.attestation
FOR EACH ROW EXECUTE FUNCTION public.notif_attestation();

CREATE OR REPLACE FUNCTION public.notif_evaluation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut = 'Publiée' AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'Publiée') THEN
    INSERT INTO public.notification (utilisateur_id, type_notification, titre, message, lien)
    SELECT p.utilisateur_id, 'EVALUATION', 'Nouvelle évaluation disponible',
      'L''évaluation « ' || NEW.titre_evaluation || ' » est maintenant disponible.', '/evaluations/mes-evaluations'
    FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
    WHERE i.session_id = NEW.session_id AND i.statut = 'Acceptée';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_evaluation ON public.evaluation;
CREATE TRIGGER trg_notif_evaluation AFTER INSERT OR UPDATE OF statut ON public.evaluation
FOR EACH ROW EXECUTE FUNCTION public.notif_evaluation();

CREATE OR REPLACE FUNCTION public.notif_paiement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT f.utilisateur_id INTO u_id FROM public.formateur f WHERE f.formateur_id = NEW.formateur_id;
  PERFORM public.creer_notification(u_id, 'PAIEMENT', 'Paiement ' || lower(NEW.statut::text),
    'Un paiement de ' || NEW.montant::text || ' a été enregistré avec le statut ' || NEW.statut::text || '.', '/formateurs');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_paiement ON public.paiement_formateur;
CREATE TRIGGER trg_notif_paiement AFTER INSERT OR UPDATE OF statut ON public.paiement_formateur
FOR EACH ROW EXECUTE FUNCTION public.notif_paiement();

CREATE OR REPLACE FUNCTION public.notif_presence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u_id BIGINT;
BEGIN
  SELECT p.utilisateur_id INTO u_id
  FROM public.inscription i JOIN public.participant p ON p.participant_id = i.participant_id
  WHERE i.inscription_id = NEW.inscription_id;
  PERFORM public.creer_notification(u_id, 'PRESENCE', 'Présence enregistrée',
    'Votre présence du ' || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' est enregistrée : ' || NEW.statut::text || '.', '/presence');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_presence ON public.presence;
CREATE TRIGGER trg_notif_presence AFTER INSERT OR UPDATE OF statut ON public.presence
FOR EACH ROW EXECUTE FUNCTION public.notif_presence();

CREATE OR REPLACE FUNCTION public.notif_evenement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut IN ('Planifié', 'En cours', 'Annulé') THEN
    PERFORM public.notifier_gestionnaires('AGENDA', 'Agenda : ' || NEW.titre,
      'Événement ' || NEW.type_evenement::text || ' — statut ' || NEW.statut::text || ' le ' || to_char(NEW.date_debut, 'DD/MM/YYYY HH24:MI') || '.', '/agenda');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_evenement ON public.evenement;
CREATE TRIGGER trg_notif_evenement AFTER INSERT OR UPDATE OF statut ON public.evenement
FOR EACH ROW EXECUTE FUNCTION public.notif_evenement();

-- ============ POLITIQUES ADMINISTRATION ============
CREATE POLICY "utilisateur gestion admin" ON public.utilisateur FOR UPDATE TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "formateur gestion admin" ON public.formateur FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "participant gestion admin" ON public.participant FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "profil pro gestion admin" ON public.profil_professionnel FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'))
WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE'));

CREATE POLICY "responsable gestion admin" ON public.responsable FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "roles utilisateur gestion admin" ON public.role_utilisateur FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR'));

CREATE POLICY "role permission gestion admin" ON public.role_permission FOR ALL TO authenticated
USING (public.a_role(auth.uid(), 'ADMINISTRATEUR')) WITH CHECK (public.a_role(auth.uid(), 'ADMINISTRATEUR'));