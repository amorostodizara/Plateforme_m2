-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.utilisateur (
  utilisateur_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  auth_user_id uuid NOT NULL UNIQUE,
  nom character varying NOT NULL DEFAULT ''::character varying,
  prenoms character varying NOT NULL DEFAULT ''::character varying,
  telephone character varying,
  email character varying NOT NULL UNIQUE,
  adresse character varying,
  genre USER-DEFINED,
  url_profil character varying,
  statut USER-DEFINED NOT NULL DEFAULT 'Actif'::statut_actif_enum,
  email_verifie boolean NOT NULL DEFAULT false,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  maj_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT utilisateur_pkey PRIMARY KEY (utilisateur_id)
);
CREATE TABLE public.role (
  role_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom_role character varying NOT NULL,
  code_role USER-DEFINED NOT NULL UNIQUE,
  statut USER-DEFINED NOT NULL DEFAULT 'Actif'::statut_actif_enum,
  description text,
  CONSTRAINT role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.permission (
  permission_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom character varying NOT NULL,
  code character varying NOT NULL UNIQUE,
  module character varying NOT NULL,
  CONSTRAINT permission_pkey PRIMARY KEY (permission_id)
);
CREATE TABLE public.role_permission (
  role_permission_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  role_id bigint NOT NULL,
  permission_id bigint NOT NULL,
  CONSTRAINT role_permission_pkey PRIMARY KEY (role_permission_id),
  CONSTRAINT role_permission_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id),
  CONSTRAINT role_permission_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permission(permission_id)
);
CREATE TABLE public.role_utilisateur (
  role_utilisateur_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT role_utilisateur_pkey PRIMARY KEY (role_utilisateur_id),
  CONSTRAINT role_utilisateur_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id),
  CONSTRAINT role_utilisateur_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id)
);
CREATE TABLE public.administrateur (
  admin_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL UNIQUE,
  service character varying,
  intitule_poste character varying,
  statut_service USER-DEFINED NOT NULL DEFAULT 'Actif'::statut_actif_enum,
  CONSTRAINT administrateur_pkey PRIMARY KEY (admin_id),
  CONSTRAINT administrateur_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.responsable (
  responsable_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL UNIQUE,
  service character varying,
  intitule_poste character varying,
  statut_service USER-DEFINED NOT NULL DEFAULT 'Actif'::statut_actif_enum,
  CONSTRAINT responsable_pkey PRIMARY KEY (responsable_id),
  CONSTRAINT responsable_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.formateur (
  formateur_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL UNIQUE,
  institution character varying,
  intitule_poste character varying,
  specialisation character varying,
  annees_experience integer,
  curriculum_vitae character varying,
  CONSTRAINT formateur_pkey PRIMARY KEY (formateur_id),
  CONSTRAINT formateur_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.participant (
  participant_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL UNIQUE,
  date_naissance date,
  codeqr_jeton character varying DEFAULT encode(gen_random_bytes(16), 'hex'::text) UNIQUE,
  CONSTRAINT participant_pkey PRIMARY KEY (participant_id),
  CONSTRAINT participant_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.profil_professionnel (
  profil_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  participant_id bigint NOT NULL UNIQUE,
  statut_actuel USER-DEFINED,
  institution character varying,
  specialisation character varying,
  mention character varying,
  niveau_education USER-DEFINED,
  CONSTRAINT profil_professionnel_pkey PRIMARY KEY (profil_id),
  CONSTRAINT profil_professionnel_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participant(participant_id)
);
CREATE TABLE public.jeton_creation_compte (
  jeton_creation_compte_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL,
  jeton character varying NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  expire_le timestamp with time zone NOT NULL DEFAULT (now() + '00:30:00'::interval),
  verifie_le timestamp with time zone,
  revoque_le timestamp with time zone,
  CONSTRAINT jeton_creation_compte_pkey PRIMARY KEY (jeton_creation_compte_id),
  CONSTRAINT jeton_creation_compte_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.jeton_mot_de_passe_oublie (
  jeton_mot_de_passe_oublie_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL,
  jeton character varying NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  expire_le timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval),
  utilise_le timestamp with time zone,
  revoque_le timestamp with time zone,
  CONSTRAINT jeton_mot_de_passe_oublie_pkey PRIMARY KEY (jeton_mot_de_passe_oublie_id),
  CONSTRAINT jeton_mot_de_passe_oublie_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.categorie_formation (
  categorie_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom character varying NOT NULL UNIQUE,
  icone character varying,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categorie_formation_pkey PRIMARY KEY (categorie_id)
);
CREATE TABLE public.formation (
  formation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  categorie_id bigint,
  titre character varying NOT NULL,
  description text,
  niveau USER-DEFINED NOT NULL DEFAULT 'Débutant'::niveau_formation_enum,
  url_image character varying,
  duree_jours integer NOT NULL DEFAULT 1,
  statut USER-DEFINED NOT NULL DEFAULT 'Brouillon'::statut_formation_enum,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT formation_pkey PRIMARY KEY (formation_id),
  CONSTRAINT formation_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES public.categorie_formation(categorie_id)
);
CREATE TABLE public.session_formation (
  session_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  formation_id bigint NOT NULL,
  formateur_id bigint,
  nom_session character varying NOT NULL,
  date_debut timestamp with time zone NOT NULL,
  date_fin timestamp with time zone NOT NULL,
  lieu character varying,
  capacite integer,
  statut USER-DEFINED NOT NULL DEFAULT 'Planifiée'::statut_session_enum,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_formation_pkey PRIMARY KEY (session_id),
  CONSTRAINT session_formation_formation_id_fkey FOREIGN KEY (formation_id) REFERENCES public.formation(formation_id),
  CONSTRAINT session_formation_formateur_id_fkey FOREIGN KEY (formateur_id) REFERENCES public.formateur(formateur_id)
);
CREATE TABLE public.inscription (
  inscription_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id bigint NOT NULL,
  participant_id bigint NOT NULL,
  date_inscription timestamp with time zone NOT NULL DEFAULT now(),
  statut USER-DEFINED NOT NULL DEFAULT 'En attente'::statut_inscription_enum,
  motivation text,
  engagement boolean NOT NULL DEFAULT false,
  maj_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inscription_pkey PRIMARY KEY (inscription_id),
  CONSTRAINT inscription_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.session_formation(session_id),
  CONSTRAINT inscription_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participant(participant_id)
);
CREATE TABLE public.presence (
  presence_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  inscription_id bigint NOT NULL,
  date_presence date NOT NULL DEFAULT CURRENT_DATE,
  present boolean NOT NULL DEFAULT false,
  statut USER-DEFINED NOT NULL DEFAULT 'Présent'::statut_presence_enum,
  methode USER-DEFINED NOT NULL DEFAULT 'Manuel'::methode_presence_enum,
  remarque text,
  enregistre_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT presence_pkey PRIMARY KEY (presence_id),
  CONSTRAINT presence_inscription_id_fkey FOREIGN KEY (inscription_id) REFERENCES public.inscription(inscription_id)
);
CREATE TABLE public.attestation (
  attestation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  inscription_id bigint NOT NULL,
  url_fichier character varying,
  delivree_le timestamp with time zone NOT NULL DEFAULT now(),
  numero_attestation character varying,
  jeton_verification character varying,
  statut USER-DEFINED NOT NULL DEFAULT 'Valide'::statut_attestation_enum,
  CONSTRAINT attestation_pkey PRIMARY KEY (attestation_id),
  CONSTRAINT attestation_inscription_id_fkey FOREIGN KEY (inscription_id) REFERENCES public.inscription(inscription_id)
);
CREATE TABLE public.evenement (
  evenement_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titre character varying NOT NULL,
  type_evenement USER-DEFINED NOT NULL DEFAULT 'Autre'::type_evenement_enum,
  date_debut timestamp with time zone NOT NULL,
  date_fin timestamp with time zone NOT NULL,
  lieu character varying,
  statut USER-DEFINED NOT NULL DEFAULT 'Planifié'::statut_evenement_enum,
  description text,
  cree_par bigint,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evenement_pkey PRIMARY KEY (evenement_id),
  CONSTRAINT evenement_cree_par_fkey FOREIGN KEY (cree_par) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.publication (
  publication_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  auteur_id bigint,
  titre character varying NOT NULL,
  contenu text,
  publie_le timestamp with time zone NOT NULL DEFAULT now(),
  statut USER-DEFINED NOT NULL DEFAULT 'Publiée'::statut_publication_enum,
  visibilite USER-DEFINED NOT NULL DEFAULT 'Public'::visibilite_publication_enum,
  CONSTRAINT publication_pkey PRIMARY KEY (publication_id),
  CONSTRAINT publication_auteur_id_fkey FOREIGN KEY (auteur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.media_publication (
  media_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  publication_id bigint NOT NULL,
  url_media character varying NOT NULL,
  type_media USER-DEFINED NOT NULL DEFAULT 'Image'::type_media_enum,
  nom_fichier character varying,
  taille_fichier bigint,
  CONSTRAINT media_publication_pkey PRIMARY KEY (media_id),
  CONSTRAINT media_publication_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public.publication(publication_id)
);
CREATE TABLE public.support_formation (
  support_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  formation_id bigint NOT NULL,
  titre character varying NOT NULL,
  url_fichier character varying NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  session_id bigint,
  nom_fichier character varying,
  taille_fichier bigint,
  type_support character varying,
  cree_par bigint,
  CONSTRAINT support_formation_pkey PRIMARY KEY (support_id),
  CONSTRAINT support_formation_formation_id_fkey FOREIGN KEY (formation_id) REFERENCES public.formation(formation_id),
  CONSTRAINT support_formation_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.session_formation(session_id),
  CONSTRAINT support_formation_cree_par_fkey FOREIGN KEY (cree_par) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.evaluation (
  evaluation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id bigint NOT NULL,
  titre_evaluation character varying NOT NULL,
  date_publication timestamp with time zone,
  date_fermeture timestamp with time zone,
  duree_minutes integer NOT NULL DEFAULT 30,
  max_tentatives integer NOT NULL DEFAULT 1,
  score_reussite numeric NOT NULL DEFAULT 50,
  statut USER-DEFINED NOT NULL DEFAULT 'Brouillon'::statut_evaluation_enum,
  cree_par bigint,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evaluation_pkey PRIMARY KEY (evaluation_id),
  CONSTRAINT evaluation_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.session_formation(session_id),
  CONSTRAINT evaluation_cree_par_fkey FOREIGN KEY (cree_par) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.question_evaluation (
  question_evaluation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  evaluation_id bigint NOT NULL,
  texte_question text NOT NULL,
  type_question USER-DEFINED NOT NULL DEFAULT 'Choix unique'::type_question_enum,
  ordre_question integer NOT NULL DEFAULT 1,
  points numeric NOT NULL DEFAULT 1,
  est_requis boolean NOT NULL DEFAULT true,
  CONSTRAINT question_evaluation_pkey PRIMARY KEY (question_evaluation_id),
  CONSTRAINT question_evaluation_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluation(evaluation_id)
);
CREATE TABLE public.option_question (
  option_question_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  question_evaluation_id bigint NOT NULL,
  texte_option character varying NOT NULL,
  est_correct boolean NOT NULL DEFAULT false,
  ordre_option integer NOT NULL DEFAULT 1,
  CONSTRAINT option_question_pkey PRIMARY KEY (option_question_id),
  CONSTRAINT option_question_question_evaluation_id_fkey FOREIGN KEY (question_evaluation_id) REFERENCES public.question_evaluation(question_evaluation_id)
);
CREATE TABLE public.tentative_evaluation (
  tentative_evaluation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  evaluation_id bigint NOT NULL,
  inscription_id bigint NOT NULL,
  numero_tentative integer NOT NULL DEFAULT 1,
  commence_le timestamp with time zone NOT NULL DEFAULT now(),
  soumis_le timestamp with time zone,
  score numeric,
  statut USER-DEFINED NOT NULL DEFAULT 'En cours'::statut_tentative_enum,
  reussi boolean NOT NULL DEFAULT false,
  CONSTRAINT tentative_evaluation_pkey PRIMARY KEY (tentative_evaluation_id),
  CONSTRAINT tentative_evaluation_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluation(evaluation_id),
  CONSTRAINT tentative_evaluation_inscription_id_fkey FOREIGN KEY (inscription_id) REFERENCES public.inscription(inscription_id)
);
CREATE TABLE public.reponse_participant (
  reponse_participant_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tentative_evaluation_id bigint NOT NULL,
  question_evaluation_id bigint NOT NULL,
  option_question_id bigint,
  est_correct boolean NOT NULL DEFAULT false,
  points_gagnes numeric NOT NULL DEFAULT 0,
  repondu_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reponse_participant_pkey PRIMARY KEY (reponse_participant_id),
  CONSTRAINT reponse_participant_tentative_evaluation_id_fkey FOREIGN KEY (tentative_evaluation_id) REFERENCES public.tentative_evaluation(tentative_evaluation_id),
  CONSTRAINT reponse_participant_question_evaluation_id_fkey FOREIGN KEY (question_evaluation_id) REFERENCES public.question_evaluation(question_evaluation_id),
  CONSTRAINT reponse_participant_option_question_id_fkey FOREIGN KEY (option_question_id) REFERENCES public.option_question(option_question_id)
);
CREATE TABLE public.commentaire_publication (
  commentaire_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  publication_id bigint NOT NULL,
  utilisateur_id bigint NOT NULL,
  contenu text NOT NULL,
  statut USER-DEFINED NOT NULL DEFAULT 'Visible'::statut_commentaire_enum,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT commentaire_publication_pkey PRIMARY KEY (commentaire_id),
  CONSTRAINT commentaire_publication_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public.publication(publication_id),
  CONSTRAINT commentaire_publication_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.reaction_publication (
  reaction_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  publication_id bigint NOT NULL,
  utilisateur_id bigint NOT NULL,
  type_reaction USER-DEFINED NOT NULL DEFAULT 'J''aime'::type_reaction_enum,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reaction_publication_pkey PRIMARY KEY (reaction_id),
  CONSTRAINT reaction_publication_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public.publication(publication_id),
  CONSTRAINT reaction_publication_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.modele_attestation (
  modele_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom_modele character varying NOT NULL DEFAULT 'Modèle par défaut'::character varying,
  url_logo character varying,
  titre_attestation character varying NOT NULL DEFAULT 'Attestation de formation'::character varying,
  texte_attestation text,
  nom_signataire character varying,
  fonction_signataire character varying,
  url_signature character varying,
  pied_de_page text,
  couleur_principale character varying NOT NULL DEFAULT '#FF7900'::character varying,
  actif boolean NOT NULL DEFAULT true,
  maj_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT modele_attestation_pkey PRIMARY KEY (modele_id)
);
CREATE TABLE public.conversation_ia (
  conversation_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL,
  titre text NOT NULL DEFAULT 'Nouvelle conversation'::text,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  maj_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_ia_pkey PRIMARY KEY (conversation_id),
  CONSTRAINT conversation_ia_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.message_ia (
  message_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint NOT NULL,
  role_message text NOT NULL,
  contenu text NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_ia_pkey PRIMARY KEY (message_id),
  CONSTRAINT message_ia_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversation_ia(conversation_id)
);
CREATE TABLE public.retour_ia (
  retour_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  message_id bigint NOT NULL,
  utilisateur_id bigint NOT NULL,
  type_retour USER-DEFINED NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT retour_ia_pkey PRIMARY KEY (retour_id),
  CONSTRAINT retour_ia_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.message_ia(message_id),
  CONSTRAINT retour_ia_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);
CREATE TABLE public.paiement_formateur (
  paiement_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  formateur_id bigint NOT NULL,
  session_id bigint,
  montant numeric NOT NULL DEFAULT 0,
  methode USER-DEFINED NOT NULL DEFAULT 'Virement'::methode_paiement_enum,
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  statut USER-DEFINED NOT NULL DEFAULT 'En attente'::statut_paiement_enum,
  remarque text,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  valide_par bigint,
  CONSTRAINT paiement_formateur_pkey PRIMARY KEY (paiement_id),
  CONSTRAINT paiement_formateur_formateur_id_fkey FOREIGN KEY (formateur_id) REFERENCES public.formateur(formateur_id),
  CONSTRAINT paiement_formateur_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.session_formation(session_id),
  CONSTRAINT paiement_formateur_valide_par_fkey FOREIGN KEY (valide_par) REFERENCES public.responsable(responsable_id)
);
CREATE TABLE public.notification (
  notification_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  utilisateur_id bigint NOT NULL,
  type_notification USER-DEFINED NOT NULL DEFAULT 'SYSTEME'::type_notification_enum,
  titre character varying NOT NULL,
  message text NOT NULL,
  lien character varying,
  lu boolean NOT NULL DEFAULT false,
  lu_le timestamp with time zone,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notification_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(utilisateur_id)
);