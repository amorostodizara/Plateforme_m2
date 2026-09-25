CREATE OR REPLACE FUNCTION public.notif_presence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  u_id BIGINT;
  nom_complet TEXT;
  nom_session TEXT;
BEGIN
  SELECT p.utilisateur_id, (us.prenoms || ' ' || us.nom), s.nom_session
    INTO u_id, nom_complet, nom_session
  FROM public.inscription i
  JOIN public.participant p ON p.participant_id = i.participant_id
  JOIN public.utilisateur us ON us.utilisateur_id = p.utilisateur_id
  JOIN public.session_formation s ON s.session_id = i.session_id
  WHERE i.inscription_id = NEW.inscription_id;

  PERFORM public.creer_notification(u_id, 'PRESENCE', 'Présence enregistrée',
    'Votre présence du ' || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' est enregistrée : ' || NEW.statut::text || '.', '/presence');

  PERFORM public.notifier_gestionnaires('PRESENCE', 'Présence ' || lower(NEW.statut::text) || ' enregistrée',
    COALESCE(nom_complet, 'Un participant') || ' — ' || COALESCE(nom_session, 'session') || ' le '
    || to_char(NEW.date_presence, 'DD/MM/YYYY') || ' (' || NEW.methode::text || ').', '/presence');

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.notif_paiement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  u_id BIGINT;
  nom_complet TEXT;
BEGIN
  SELECT f.utilisateur_id, (u.prenoms || ' ' || u.nom) INTO u_id, nom_complet
  FROM public.formateur f JOIN public.utilisateur u ON u.utilisateur_id = f.utilisateur_id
  WHERE f.formateur_id = NEW.formateur_id;

  PERFORM public.creer_notification(u_id, 'PAIEMENT', 'Paiement ' || lower(NEW.statut::text),
    'Un paiement de ' || NEW.montant::text || ' a été enregistré avec le statut ' || NEW.statut::text || '.', '/paiements-formateurs');

  PERFORM public.notifier_gestionnaires('PAIEMENT', 'Paiement formateur ' || lower(NEW.statut::text),
    COALESCE(nom_complet, 'Formateur') || ' — ' || NEW.montant::text || ' (' || NEW.methode::text || ').', '/paiements-formateurs');

  RETURN NEW;
END $function$;