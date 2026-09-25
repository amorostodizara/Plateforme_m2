CREATE OR REPLACE FUNCTION public.creer_utilisateur_applicatif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_utilisateur_id BIGINT;
  v_role_id BIGINT;
  v_participant_id BIGINT;
  v_admin_existe BOOLEAN;
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

  -- Le tout premier compte créé devient administrateur de la plateforme
  SELECT EXISTS (SELECT 1 FROM public.administrateur) INTO v_admin_existe;
  IF NOT v_admin_existe THEN
    SELECT role_id INTO v_role_id FROM public.role WHERE code_role = 'ADMINISTRATEUR';
    INSERT INTO public.role_utilisateur (utilisateur_id, role_id)
    VALUES (v_utilisateur_id, v_role_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.administrateur (utilisateur_id, service, intitule_poste)
    VALUES (v_utilisateur_id, 'Orange Digital Center', 'Administrateur');
  END IF;

  RETURN NEW;
END;
$function$;