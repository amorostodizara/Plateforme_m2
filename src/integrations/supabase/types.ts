export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      administrateur: {
        Row: {
          admin_id: number
          intitule_poste: string | null
          service: string | null
          statut_service: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id: number
        }
        Insert: {
          admin_id?: never
          intitule_poste?: string | null
          service?: string | null
          statut_service?: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id: number
        }
        Update: {
          admin_id?: never
          intitule_poste?: string | null
          service?: string | null
          statut_service?: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'administrateur_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: true
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      attestation: {
        Row: {
          attestation_id: number
          delivree_le: string
          inscription_id: number
          jeton_verification: string | null
          numero_attestation: string | null
          statut: Database['public']['Enums']['statut_attestation_enum']
          url_fichier: string | null
        }
        Insert: {
          attestation_id?: never
          delivree_le?: string
          inscription_id: number
          jeton_verification?: string | null
          numero_attestation?: string | null
          statut?: Database['public']['Enums']['statut_attestation_enum']
          url_fichier?: string | null
        }
        Update: {
          attestation_id?: never
          delivree_le?: string
          inscription_id?: number
          jeton_verification?: string | null
          numero_attestation?: string | null
          statut?: Database['public']['Enums']['statut_attestation_enum']
          url_fichier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attestation_inscription_id_fkey'
            columns: ['inscription_id']
            isOneToOne: false
            referencedRelation: 'inscription'
            referencedColumns: ['inscription_id']
          },
        ]
      }
      categorie_formation: {
        Row: {
          categorie_id: number
          cree_le: string
          icone: string | null
          nom: string
        }
        Insert: {
          categorie_id?: never
          cree_le?: string
          icone?: string | null
          nom: string
        }
        Update: {
          categorie_id?: never
          cree_le?: string
          icone?: string | null
          nom?: string
        }
        Relationships: []
      }
      commentaire_publication: {
        Row: {
          commentaire_id: number
          contenu: string
          cree_le: string
          publication_id: number
          statut: Database['public']['Enums']['statut_commentaire_enum']
          utilisateur_id: number
        }
        Insert: {
          commentaire_id?: never
          contenu: string
          cree_le?: string
          publication_id: number
          statut?: Database['public']['Enums']['statut_commentaire_enum']
          utilisateur_id: number
        }
        Update: {
          commentaire_id?: never
          contenu?: string
          cree_le?: string
          publication_id?: number
          statut?: Database['public']['Enums']['statut_commentaire_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'commentaire_publication_publication_id_fkey'
            columns: ['publication_id']
            isOneToOne: false
            referencedRelation: 'publication'
            referencedColumns: ['publication_id']
          },
          {
            foreignKeyName: 'commentaire_publication_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      conversation_ia: {
        Row: {
          conversation_id: number
          cree_le: string
          maj_le: string
          titre: string
          utilisateur_id: number
        }
        Insert: {
          conversation_id?: never
          cree_le?: string
          maj_le?: string
          titre?: string
          utilisateur_id: number
        }
        Update: {
          conversation_id?: never
          cree_le?: string
          maj_le?: string
          titre?: string
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_ia_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      evaluation: {
        Row: {
          cree_le: string
          cree_par: number | null
          date_fermeture: string | null
          date_publication: string | null
          duree_minutes: number
          evaluation_id: number
          max_tentatives: number
          score_reussite: number
          session_id: number
          statut: Database['public']['Enums']['statut_evaluation_enum']
          titre_evaluation: string
        }
        Insert: {
          cree_le?: string
          cree_par?: number | null
          date_fermeture?: string | null
          date_publication?: string | null
          duree_minutes?: number
          evaluation_id?: never
          max_tentatives?: number
          score_reussite?: number
          session_id: number
          statut?: Database['public']['Enums']['statut_evaluation_enum']
          titre_evaluation: string
        }
        Update: {
          cree_le?: string
          cree_par?: number | null
          date_fermeture?: string | null
          date_publication?: string | null
          duree_minutes?: number
          evaluation_id?: never
          max_tentatives?: number
          score_reussite?: number
          session_id?: number
          statut?: Database['public']['Enums']['statut_evaluation_enum']
          titre_evaluation?: string
        }
        Relationships: [
          {
            foreignKeyName: 'evaluation_cree_par_fkey'
            columns: ['cree_par']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
          {
            foreignKeyName: 'evaluation_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'session_formation'
            referencedColumns: ['session_id']
          },
        ]
      }
      evenement: {
        Row: {
          cree_le: string
          cree_par: number | null
          date_debut: string
          date_fin: string
          description: string | null
          evenement_id: number
          lieu: string | null
          statut: Database['public']['Enums']['statut_evenement_enum']
          titre: string
          type_evenement: Database['public']['Enums']['type_evenement_enum']
        }
        Insert: {
          cree_le?: string
          cree_par?: number | null
          date_debut: string
          date_fin: string
          description?: string | null
          evenement_id?: never
          lieu?: string | null
          statut?: Database['public']['Enums']['statut_evenement_enum']
          titre: string
          type_evenement?: Database['public']['Enums']['type_evenement_enum']
        }
        Update: {
          cree_le?: string
          cree_par?: number | null
          date_debut?: string
          date_fin?: string
          description?: string | null
          evenement_id?: never
          lieu?: string | null
          statut?: Database['public']['Enums']['statut_evenement_enum']
          titre?: string
          type_evenement?: Database['public']['Enums']['type_evenement_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'evenement_cree_par_fkey'
            columns: ['cree_par']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      formateur: {
        Row: {
          annees_experience: number | null
          curriculum_vitae: string | null
          formateur_id: number
          institution: string | null
          intitule_poste: string | null
          specialisation: string | null
          utilisateur_id: number
        }
        Insert: {
          annees_experience?: number | null
          curriculum_vitae?: string | null
          formateur_id?: never
          institution?: string | null
          intitule_poste?: string | null
          specialisation?: string | null
          utilisateur_id: number
        }
        Update: {
          annees_experience?: number | null
          curriculum_vitae?: string | null
          formateur_id?: never
          institution?: string | null
          intitule_poste?: string | null
          specialisation?: string | null
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'formateur_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: true
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      formation: {
        Row: {
          categorie_id: number | null
          cree_le: string
          description: string | null
          duree_jours: number
          formation_id: number
          niveau: Database['public']['Enums']['niveau_formation_enum']
          statut: Database['public']['Enums']['statut_formation_enum']
          titre: string
          url_image: string | null
        }
        Insert: {
          categorie_id?: number | null
          cree_le?: string
          description?: string | null
          duree_jours?: number
          formation_id?: never
          niveau?: Database['public']['Enums']['niveau_formation_enum']
          statut?: Database['public']['Enums']['statut_formation_enum']
          titre: string
          url_image?: string | null
        }
        Update: {
          categorie_id?: number | null
          cree_le?: string
          description?: string | null
          duree_jours?: number
          formation_id?: never
          niveau?: Database['public']['Enums']['niveau_formation_enum']
          statut?: Database['public']['Enums']['statut_formation_enum']
          titre?: string
          url_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'formation_categorie_id_fkey'
            columns: ['categorie_id']
            isOneToOne: false
            referencedRelation: 'categorie_formation'
            referencedColumns: ['categorie_id']
          },
        ]
      }
      inscription: {
        Row: {
          date_inscription: string
          engagement: boolean
          inscription_id: number
          maj_le: string
          motivation: string | null
          participant_id: number
          session_id: number
          statut: Database['public']['Enums']['statut_inscription_enum']
        }
        Insert: {
          date_inscription?: string
          engagement?: boolean
          inscription_id?: never
          maj_le?: string
          motivation?: string | null
          participant_id: number
          session_id: number
          statut?: Database['public']['Enums']['statut_inscription_enum']
        }
        Update: {
          date_inscription?: string
          engagement?: boolean
          inscription_id?: never
          maj_le?: string
          motivation?: string | null
          participant_id?: number
          session_id?: number
          statut?: Database['public']['Enums']['statut_inscription_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'inscription_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participant'
            referencedColumns: ['participant_id']
          },
          {
            foreignKeyName: 'inscription_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'session_formation'
            referencedColumns: ['session_id']
          },
        ]
      }
      jeton_creation_compte: {
        Row: {
          cree_le: string
          expire_le: string
          jeton: string
          jeton_creation_compte_id: number
          revoque_le: string | null
          utilisateur_id: number
          verifie_le: string | null
        }
        Insert: {
          cree_le?: string
          expire_le?: string
          jeton: string
          jeton_creation_compte_id?: never
          revoque_le?: string | null
          utilisateur_id: number
          verifie_le?: string | null
        }
        Update: {
          cree_le?: string
          expire_le?: string
          jeton?: string
          jeton_creation_compte_id?: never
          revoque_le?: string | null
          utilisateur_id?: number
          verifie_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'jeton_creation_compte_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      jeton_mot_de_passe_oublie: {
        Row: {
          cree_le: string
          expire_le: string
          jeton: string
          jeton_mot_de_passe_oublie_id: number
          revoque_le: string | null
          utilisateur_id: number
          utilise_le: string | null
        }
        Insert: {
          cree_le?: string
          expire_le?: string
          jeton: string
          jeton_mot_de_passe_oublie_id?: never
          revoque_le?: string | null
          utilisateur_id: number
          utilise_le?: string | null
        }
        Update: {
          cree_le?: string
          expire_le?: string
          jeton?: string
          jeton_mot_de_passe_oublie_id?: never
          revoque_le?: string | null
          utilisateur_id?: number
          utilise_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'jeton_mot_de_passe_oublie_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      media_publication: {
        Row: {
          media_id: number
          nom_fichier: string | null
          publication_id: number
          taille_fichier: number | null
          type_media: Database['public']['Enums']['type_media_enum']
          url_media: string
        }
        Insert: {
          media_id?: never
          nom_fichier?: string | null
          publication_id: number
          taille_fichier?: number | null
          type_media?: Database['public']['Enums']['type_media_enum']
          url_media: string
        }
        Update: {
          media_id?: never
          nom_fichier?: string | null
          publication_id?: number
          taille_fichier?: number | null
          type_media?: Database['public']['Enums']['type_media_enum']
          url_media?: string
        }
        Relationships: [
          {
            foreignKeyName: 'media_publication_publication_id_fkey'
            columns: ['publication_id']
            isOneToOne: false
            referencedRelation: 'publication'
            referencedColumns: ['publication_id']
          },
        ]
      }
      message_ia: {
        Row: {
          contenu: string
          conversation_id: number
          cree_le: string
          message_id: number
          role_message: string
        }
        Insert: {
          contenu: string
          conversation_id: number
          cree_le?: string
          message_id?: never
          role_message: string
        }
        Update: {
          contenu?: string
          conversation_id?: number
          cree_le?: string
          message_id?: never
          role_message?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_ia_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversation_ia'
            referencedColumns: ['conversation_id']
          },
        ]
      }
      modele_attestation: {
        Row: {
          actif: boolean
          couleur_principale: string
          fonction_signataire: string | null
          maj_le: string
          modele_id: number
          nom_modele: string
          nom_signataire: string | null
          pied_de_page: string | null
          texte_attestation: string | null
          titre_attestation: string
          url_logo: string | null
          url_signature: string | null
        }
        Insert: {
          actif?: boolean
          couleur_principale?: string
          fonction_signataire?: string | null
          maj_le?: string
          modele_id?: never
          nom_modele?: string
          nom_signataire?: string | null
          pied_de_page?: string | null
          texte_attestation?: string | null
          titre_attestation?: string
          url_logo?: string | null
          url_signature?: string | null
        }
        Update: {
          actif?: boolean
          couleur_principale?: string
          fonction_signataire?: string | null
          maj_le?: string
          modele_id?: never
          nom_modele?: string
          nom_signataire?: string | null
          pied_de_page?: string | null
          texte_attestation?: string | null
          titre_attestation?: string
          url_logo?: string | null
          url_signature?: string | null
        }
        Relationships: []
      }
      notification: {
        Row: {
          cree_le: string
          lien: string | null
          lu: boolean
          lu_le: string | null
          message: string
          notification_id: number
          titre: string
          type_notification: Database['public']['Enums']['type_notification_enum']
          utilisateur_id: number
        }
        Insert: {
          cree_le?: string
          lien?: string | null
          lu?: boolean
          lu_le?: string | null
          message: string
          notification_id?: never
          titre: string
          type_notification?: Database['public']['Enums']['type_notification_enum']
          utilisateur_id: number
        }
        Update: {
          cree_le?: string
          lien?: string | null
          lu?: boolean
          lu_le?: string | null
          message?: string
          notification_id?: never
          titre?: string
          type_notification?: Database['public']['Enums']['type_notification_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'notification_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      option_question: {
        Row: {
          est_correct: boolean
          option_question_id: number
          ordre_option: number
          question_evaluation_id: number
          texte_option: string
        }
        Insert: {
          est_correct?: boolean
          option_question_id?: never
          ordre_option?: number
          question_evaluation_id: number
          texte_option: string
        }
        Update: {
          est_correct?: boolean
          option_question_id?: never
          ordre_option?: number
          question_evaluation_id?: number
          texte_option?: string
        }
        Relationships: [
          {
            foreignKeyName: 'option_question_question_evaluation_id_fkey'
            columns: ['question_evaluation_id']
            isOneToOne: false
            referencedRelation: 'question_evaluation'
            referencedColumns: ['question_evaluation_id']
          },
        ]
      }
      paiement_formateur: {
        Row: {
          cree_le: string
          date_paiement: string
          formateur_id: number
          methode: Database['public']['Enums']['methode_paiement_enum']
          montant: number
          ref: string | null
          paiement_id: number
          remarque: string | null
          session_id: number | null
          statut: Database['public']['Enums']['statut_paiement_enum']
          valide_par: number | null
        }
        Insert: {
          cree_le?: string
          date_paiement?: string
          formateur_id: number
          methode?: Database['public']['Enums']['methode_paiement_enum']
          ref?: string | null
          montant?: number
          paiement_id?: never
          remarque?: string | null
          session_id?: number | null
          statut?: Database['public']['Enums']['statut_paiement_enum']
          valide_par?: number | null
        }
        Update: {
          cree_le?: string
          date_paiement?: string
          formateur_id?: number
          methode?: Database['public']['Enums']['methode_paiement_enum']
          ref?: string | null
          montant?: number
          paiement_id?: never
          remarque?: string | null
          session_id?: number | null
          statut?: Database['public']['Enums']['statut_paiement_enum']
          valide_par?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'paiement_formateur_formateur_id_fkey'
            columns: ['formateur_id']
            isOneToOne: false
            referencedRelation: 'formateur'
            referencedColumns: ['formateur_id']
          },
          {
            foreignKeyName: 'paiement_formateur_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'session_formation'
            referencedColumns: ['session_id']
          },
          {
            foreignKeyName: 'paiement_formateur_valide_par_fkey'
            columns: ['valide_par']
            isOneToOne: false
            referencedRelation: 'responsable'
            referencedColumns: ['responsable_id']
          },
        ]
      }
      participant: {
        Row: {
          codeqr_jeton: string | null
          date_naissance: string | null
          participant_id: number
          utilisateur_id: number
        }
        Insert: {
          codeqr_jeton?: string | null
          date_naissance?: string | null
          participant_id?: never
          utilisateur_id: number
        }
        Update: {
          codeqr_jeton?: string | null
          date_naissance?: string | null
          participant_id?: never
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'participant_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: true
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      permission: {
        Row: {
          code: string
          module: string
          nom: string
          permission_id: number
        }
        Insert: {
          code: string
          module: string
          nom: string
          permission_id?: never
        }
        Update: {
          code?: string
          module?: string
          nom?: string
          permission_id?: never
        }
        Relationships: []
      }
      presence: {
        Row: {
          date_presence: string
          enregistre_le: string
          inscription_id: number
          methode: Database['public']['Enums']['methode_presence_enum']
          presence_id: number
          present: boolean
          remarque: string | null
          statut: Database['public']['Enums']['statut_presence_enum']
        }
        Insert: {
          date_presence?: string
          enregistre_le?: string
          inscription_id: number
          methode?: Database['public']['Enums']['methode_presence_enum']
          presence_id?: never
          present?: boolean
          remarque?: string | null
          statut?: Database['public']['Enums']['statut_presence_enum']
        }
        Update: {
          date_presence?: string
          enregistre_le?: string
          inscription_id?: number
          methode?: Database['public']['Enums']['methode_presence_enum']
          presence_id?: never
          present?: boolean
          remarque?: string | null
          statut?: Database['public']['Enums']['statut_presence_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'presence_inscription_id_fkey'
            columns: ['inscription_id']
            isOneToOne: false
            referencedRelation: 'inscription'
            referencedColumns: ['inscription_id']
          },
        ]
      }
      profil_professionnel: {
        Row: {
          institution: string | null
          mention: string | null
          niveau_education:
            Database['public']['Enums']['niveau_education_enum'] | null
          participant_id: number
          profil_id: number
          specialisation: string | null
          statut_actuel:
            Database['public']['Enums']['statut_actuel_enum'] | null
        }
        Insert: {
          institution?: string | null
          mention?: string | null
          niveau_education?:
            Database['public']['Enums']['niveau_education_enum'] | null
          participant_id: number
          profil_id?: never
          specialisation?: string | null
          statut_actuel?:
            Database['public']['Enums']['statut_actuel_enum'] | null
        }
        Update: {
          institution?: string | null
          mention?: string | null
          niveau_education?:
            Database['public']['Enums']['niveau_education_enum'] | null
          participant_id?: number
          profil_id?: never
          specialisation?: string | null
          statut_actuel?:
            Database['public']['Enums']['statut_actuel_enum'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'profil_professionnel_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: true
            referencedRelation: 'participant'
            referencedColumns: ['participant_id']
          },
        ]
      }
      publication: {
        Row: {
          auteur_id: number | null
          contenu: string | null
          publication_id: number
          publie_le: string
          statut: Database['public']['Enums']['statut_publication_enum']
          titre: string
          visibilite: Database['public']['Enums']['visibilite_publication_enum']
        }
        Insert: {
          auteur_id?: number | null
          contenu?: string | null
          publication_id?: never
          publie_le?: string
          statut?: Database['public']['Enums']['statut_publication_enum']
          titre: string
          visibilite?: Database['public']['Enums']['visibilite_publication_enum']
        }
        Update: {
          auteur_id?: number | null
          contenu?: string | null
          publication_id?: never
          publie_le?: string
          statut?: Database['public']['Enums']['statut_publication_enum']
          titre?: string
          visibilite?: Database['public']['Enums']['visibilite_publication_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'publication_auteur_id_fkey'
            columns: ['auteur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      question_evaluation: {
        Row: {
          est_requis: boolean
          evaluation_id: number
          ordre_question: number
          points: number
          question_evaluation_id: number
          texte_question: string
          type_question: Database['public']['Enums']['type_question_enum']
        }
        Insert: {
          est_requis?: boolean
          evaluation_id: number
          ordre_question?: number
          points?: number
          question_evaluation_id?: never
          texte_question: string
          type_question?: Database['public']['Enums']['type_question_enum']
        }
        Update: {
          est_requis?: boolean
          evaluation_id?: number
          ordre_question?: number
          points?: number
          question_evaluation_id?: never
          texte_question?: string
          type_question?: Database['public']['Enums']['type_question_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'question_evaluation_evaluation_id_fkey'
            columns: ['evaluation_id']
            isOneToOne: false
            referencedRelation: 'evaluation'
            referencedColumns: ['evaluation_id']
          },
        ]
      }
      reaction_publication: {
        Row: {
          cree_le: string
          publication_id: number
          reaction_id: number
          type_reaction: Database['public']['Enums']['type_reaction_enum']
          utilisateur_id: number
        }
        Insert: {
          cree_le?: string
          publication_id: number
          reaction_id?: never
          type_reaction?: Database['public']['Enums']['type_reaction_enum']
          utilisateur_id: number
        }
        Update: {
          cree_le?: string
          publication_id?: number
          reaction_id?: never
          type_reaction?: Database['public']['Enums']['type_reaction_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'reaction_publication_publication_id_fkey'
            columns: ['publication_id']
            isOneToOne: false
            referencedRelation: 'publication'
            referencedColumns: ['publication_id']
          },
          {
            foreignKeyName: 'reaction_publication_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      reponse_participant: {
        Row: {
          est_correct: boolean
          option_question_id: number | null
          points_gagnes: number
          question_evaluation_id: number
          repondu_le: string
          reponse_participant_id: number
          tentative_evaluation_id: number
        }
        Insert: {
          est_correct?: boolean
          option_question_id?: number | null
          points_gagnes?: number
          question_evaluation_id: number
          repondu_le?: string
          reponse_participant_id?: never
          tentative_evaluation_id: number
        }
        Update: {
          est_correct?: boolean
          option_question_id?: number | null
          points_gagnes?: number
          question_evaluation_id?: number
          repondu_le?: string
          reponse_participant_id?: never
          tentative_evaluation_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'reponse_participant_option_question_id_fkey'
            columns: ['option_question_id']
            isOneToOne: false
            referencedRelation: 'option_question'
            referencedColumns: ['option_question_id']
          },
          {
            foreignKeyName: 'reponse_participant_question_evaluation_id_fkey'
            columns: ['question_evaluation_id']
            isOneToOne: false
            referencedRelation: 'question_evaluation'
            referencedColumns: ['question_evaluation_id']
          },
          {
            foreignKeyName: 'reponse_participant_tentative_evaluation_id_fkey'
            columns: ['tentative_evaluation_id']
            isOneToOne: false
            referencedRelation: 'tentative_evaluation'
            referencedColumns: ['tentative_evaluation_id']
          },
        ]
      }
      responsable: {
        Row: {
          intitule_poste: string | null
          responsable_id: number
          service: string | null
          statut_service: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id: number
        }
        Insert: {
          intitule_poste?: string | null
          responsable_id?: never
          service?: string | null
          statut_service?: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id: number
        }
        Update: {
          intitule_poste?: string | null
          responsable_id?: never
          service?: string | null
          statut_service?: Database['public']['Enums']['statut_actif_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'responsable_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: true
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      retour_ia: {
        Row: {
          cree_le: string
          message_id: number
          retour_id: number
          type_retour: Database['public']['Enums']['type_retour_ia_enum']
          utilisateur_id: number
        }
        Insert: {
          cree_le?: string
          message_id: number
          retour_id?: never
          type_retour: Database['public']['Enums']['type_retour_ia_enum']
          utilisateur_id: number
        }
        Update: {
          cree_le?: string
          message_id?: number
          retour_id?: never
          type_retour?: Database['public']['Enums']['type_retour_ia_enum']
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'retour_ia_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'message_ia'
            referencedColumns: ['message_id']
          },
          {
            foreignKeyName: 'retour_ia_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      role: {
        Row: {
          code_role: Database['public']['Enums']['code_role_enum']
          description: string | null
          nom_role: string
          role_id: number
          statut: Database['public']['Enums']['statut_actif_enum']
        }
        Insert: {
          code_role: Database['public']['Enums']['code_role_enum']
          description?: string | null
          nom_role: string
          role_id?: never
          statut?: Database['public']['Enums']['statut_actif_enum']
        }
        Update: {
          code_role?: Database['public']['Enums']['code_role_enum']
          description?: string | null
          nom_role?: string
          role_id?: never
          statut?: Database['public']['Enums']['statut_actif_enum']
        }
        Relationships: []
      }
      role_permission: {
        Row: {
          permission_id: number
          role_id: number
          role_permission_id: number
        }
        Insert: {
          permission_id: number
          role_id: number
          role_permission_id?: never
        }
        Update: {
          permission_id?: number
          role_id?: number
          role_permission_id?: never
        }
        Relationships: [
          {
            foreignKeyName: 'role_permission_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permission'
            referencedColumns: ['permission_id']
          },
          {
            foreignKeyName: 'role_permission_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'role'
            referencedColumns: ['role_id']
          },
        ]
      }
      role_utilisateur: {
        Row: {
          role_id: number
          role_utilisateur_id: number
          utilisateur_id: number
        }
        Insert: {
          role_id: number
          role_utilisateur_id?: never
          utilisateur_id: number
        }
        Update: {
          role_id?: number
          role_utilisateur_id?: never
          utilisateur_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'role_utilisateur_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'role'
            referencedColumns: ['role_id']
          },
          {
            foreignKeyName: 'role_utilisateur_utilisateur_id_fkey'
            columns: ['utilisateur_id']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
        ]
      }
      session_formation: {
        Row: {
          capacite: number | null
          cree_le: string
          date_debut: string
          date_fin: string
          formateur_id: number | null
          formation_id: number
          lieu: string | null
          nom_session: string
          session_id: number
          statut: Database['public']['Enums']['statut_session_enum']
        }
        Insert: {
          capacite?: number | null
          cree_le?: string
          date_debut: string
          date_fin: string
          formateur_id?: number | null
          formation_id: number
          lieu?: string | null
          nom_session: string
          session_id?: never
          statut?: Database['public']['Enums']['statut_session_enum']
        }
        Update: {
          capacite?: number | null
          cree_le?: string
          date_debut?: string
          date_fin?: string
          formateur_id?: number | null
          formation_id?: number
          lieu?: string | null
          nom_session?: string
          session_id?: never
          statut?: Database['public']['Enums']['statut_session_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'session_formation_formateur_id_fkey'
            columns: ['formateur_id']
            isOneToOne: false
            referencedRelation: 'formateur'
            referencedColumns: ['formateur_id']
          },
          {
            foreignKeyName: 'session_formation_formation_id_fkey'
            columns: ['formation_id']
            isOneToOne: false
            referencedRelation: 'formation'
            referencedColumns: ['formation_id']
          },
        ]
      }
      support_formation: {
        Row: {
          cree_le: string
          cree_par: number | null
          formation_id: number
          nom_fichier: string | null
          session_id: number | null
          support_id: number
          taille_fichier: number | null
          titre: string
          type_support: string | null
          url_fichier: string
        }
        Insert: {
          cree_le?: string
          cree_par?: number | null
          formation_id: number
          nom_fichier?: string | null
          session_id?: number | null
          support_id?: never
          taille_fichier?: number | null
          titre: string
          type_support?: string | null
          url_fichier: string
        }
        Update: {
          cree_le?: string
          cree_par?: number | null
          formation_id?: number
          nom_fichier?: string | null
          session_id?: number | null
          support_id?: never
          taille_fichier?: number | null
          titre?: string
          type_support?: string | null
          url_fichier?: string
        }
        Relationships: [
          {
            foreignKeyName: 'support_formation_cree_par_fkey'
            columns: ['cree_par']
            isOneToOne: false
            referencedRelation: 'utilisateur'
            referencedColumns: ['utilisateur_id']
          },
          {
            foreignKeyName: 'support_formation_formation_id_fkey'
            columns: ['formation_id']
            isOneToOne: false
            referencedRelation: 'formation'
            referencedColumns: ['formation_id']
          },
          {
            foreignKeyName: 'support_formation_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'session_formation'
            referencedColumns: ['session_id']
          },
        ]
      }
      tentative_evaluation: {
        Row: {
          commence_le: string
          evaluation_id: number
          inscription_id: number
          numero_tentative: number
          reussi: boolean
          score: number | null
          soumis_le: string | null
          statut: Database['public']['Enums']['statut_tentative_enum']
          tentative_evaluation_id: number
        }
        Insert: {
          commence_le?: string
          evaluation_id: number
          inscription_id: number
          numero_tentative?: number
          reussi?: boolean
          score?: number | null
          soumis_le?: string | null
          statut?: Database['public']['Enums']['statut_tentative_enum']
          tentative_evaluation_id?: never
        }
        Update: {
          commence_le?: string
          evaluation_id?: number
          inscription_id?: number
          numero_tentative?: number
          reussi?: boolean
          score?: number | null
          soumis_le?: string | null
          statut?: Database['public']['Enums']['statut_tentative_enum']
          tentative_evaluation_id?: never
        }
        Relationships: [
          {
            foreignKeyName: 'tentative_evaluation_evaluation_id_fkey'
            columns: ['evaluation_id']
            isOneToOne: false
            referencedRelation: 'evaluation'
            referencedColumns: ['evaluation_id']
          },
          {
            foreignKeyName: 'tentative_evaluation_inscription_id_fkey'
            columns: ['inscription_id']
            isOneToOne: false
            referencedRelation: 'inscription'
            referencedColumns: ['inscription_id']
          },
        ]
      }
      utilisateur: {
        Row: {
          adresse: string | null
          auth_user_id: string
          cree_le: string
          email: string
          email_verifie: boolean
          genre: Database['public']['Enums']['genre_enum'] | null
          maj_le: string
          nom: string
          prenoms: string
          statut: Database['public']['Enums']['statut_actif_enum']
          telephone: string | null
          url_profil: string | null
          utilisateur_id: number
        }
        Insert: {
          adresse?: string | null
          auth_user_id: string
          cree_le?: string
          email: string
          email_verifie?: boolean
          genre?: Database['public']['Enums']['genre_enum'] | null
          maj_le?: string
          nom?: string
          prenoms?: string
          statut?: Database['public']['Enums']['statut_actif_enum']
          telephone?: string | null
          url_profil?: string | null
          utilisateur_id?: never
        }
        Update: {
          adresse?: string | null
          auth_user_id?: string
          cree_le?: string
          email?: string
          email_verifie?: boolean
          genre?: Database['public']['Enums']['genre_enum'] | null
          maj_le?: string
          nom?: string
          prenoms?: string
          statut?: Database['public']['Enums']['statut_actif_enum']
          telephone?: string | null
          url_profil?: string | null
          utilisateur_id?: never
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      a_permission: {
        Args: { _auth_user_id: string; _code: string }
        Returns: boolean
      }
      a_role: {
        Args: {
          _auth_user_id: string
          _code: Database['public']['Enums']['code_role_enum']
        }
        Returns: boolean
      }
      creer_notification: {
        Args: {
          _lien?: string
          _message: string
          _titre: string
          _type: Database['public']['Enums']['type_notification_enum']
          _utilisateur_id: number
        }
        Returns: undefined
      }
      notifier_gestionnaires: {
        Args: {
          _lien?: string
          _message: string
          _titre: string
          _type: Database['public']['Enums']['type_notification_enum']
        }
        Returns: undefined
      }
      peut_voir_evaluation: {
        Args: { _evaluation_id: number }
        Returns: boolean
      }
      utilisateur_courant_id: { Args: never; Returns: number }
    }
    Enums: {
      code_role_enum:
        'PARTICIPANT' | 'FORMATEUR' | 'RESPONSABLE' | 'ADMINISTRATEUR'
      genre_enum: 'Homme' | 'Femme'
      methode_paiement_enum: 'Espèces' | 'Mobile Money' | 'Virement' | 'Chèque'
      methode_presence_enum: 'QR Code' | 'Manuel' | 'Système'
      niveau_education_enum:
        'BEPC' | 'BAC' | 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'Doctorat' | 'Autre'
      niveau_formation_enum: 'Débutant' | 'Intermédiaire' | 'Avancé'
      statut_actif_enum: 'Actif' | 'Inactif'
      statut_actuel_enum:
        | 'Étudiant'
        | 'Employé'
        | 'Fonctionnaire'
        | 'Chômeur'
        | 'Indépendant'
        | 'Entrepreneur'
        | 'Autre'
      statut_attestation_enum: 'Valide' | 'Invalide' | 'Annulée'
      statut_commentaire_enum: 'Visible' | 'Masqué'
      statut_evaluation_enum: 'Brouillon' | 'Publiée' | 'Fermée'
      statut_evenement_enum:
        'Brouillon' | 'Planifié' | 'En cours' | 'Terminé' | 'Annulé'
      statut_formation_enum: 'Brouillon' | 'Publiée' | 'Archivée'
      statut_inscription_enum:
        'En attente' | 'Acceptée' | 'Refusée' | "Liste d'attente" | 'Annulée'
      statut_paiement_enum: 'En attente' | 'Payé' | 'Annulé'
      statut_presence_enum: 'Présent' | 'Absent'
      statut_publication_enum: 'Brouillon' | 'Publiée' | 'Archivée'
      statut_session_enum: 'Planifiée' | 'En cours' | 'Terminée' | 'Annulée'
      statut_tentative_enum: 'En cours' | 'Soumise' | 'Corrigée'
      type_evenement_enum:
        'Réunion' | 'Atelier' | 'Conférence' | 'Cérémonie' | 'Autre'
      type_media_enum: 'Image' | 'Vidéo' | 'Document'
      type_notification_enum:
        | 'INSCRIPTION'
        | 'FORMATION'
        | 'SESSION'
        | 'PRESENCE'
        | 'EVALUATION'
        | 'ATTESTATION'
        | 'AGENDA'
        | 'PUBLICATION'
        | 'PAIEMENT'
        | 'ADMINISTRATION'
        | 'SYSTEME'
      type_question_enum: 'Choix unique' | 'Choix multiple' | 'Vrai/Faux'
      type_reaction_enum: "J'aime" | "J'adore" | 'Bravo' | 'Intéressant'
      type_retour_ia_enum: 'Positive' | 'Négative'
      visibilite_publication_enum:
        | 'Public'
        | 'Participant'
        | 'Responsable'
        | 'Administrateur'
        | 'Formateur'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      code_role_enum: [
        'PARTICIPANT',
        'FORMATEUR',
        'RESPONSABLE',
        'ADMINISTRATEUR',
      ],
      genre_enum: ['Homme', 'Femme'],
      methode_paiement_enum: ['Espèces', 'Mobile Money', 'Virement', 'Chèque'],
      methode_presence_enum: ['QR Code', 'Manuel', 'Système'],
      niveau_education_enum: [
        'BEPC',
        'BAC',
        'L1',
        'L2',
        'L3',
        'M1',
        'M2',
        'Doctorat',
        'Autre',
      ],
      niveau_formation_enum: ['Débutant', 'Intermédiaire', 'Avancé'],
      statut_actif_enum: ['Actif', 'Inactif'],
      statut_actuel_enum: [
        'Étudiant',
        'Employé',
        'Fonctionnaire',
        'Chômeur',
        'Indépendant',
        'Entrepreneur',
        'Autre',
      ],
      statut_attestation_enum: ['Valide', 'Invalide', 'Annulée'],
      statut_commentaire_enum: ['Visible', 'Masqué'],
      statut_evaluation_enum: ['Brouillon', 'Publiée', 'Fermée'],
      statut_evenement_enum: [
        'Brouillon',
        'Planifié',
        'En cours',
        'Terminé',
        'Annulé',
      ],
      statut_formation_enum: ['Brouillon', 'Publiée', 'Archivée'],
      statut_inscription_enum: [
        'En attente',
        'Acceptée',
        'Refusée',
        "Liste d'attente",
        'Annulée',
      ],
      statut_paiement_enum: ['En attente', 'Payé', 'Annulé'],
      statut_presence_enum: ['Présent', 'Absent'],
      statut_publication_enum: ['Brouillon', 'Publiée', 'Archivée'],
      statut_session_enum: ['Planifiée', 'En cours', 'Terminée', 'Annulée'],
      statut_tentative_enum: ['En cours', 'Soumise', 'Corrigée'],
      type_evenement_enum: [
        'Réunion',
        'Atelier',
        'Conférence',
        'Cérémonie',
        'Autre',
      ],
      type_media_enum: ['Image', 'Vidéo', 'Document'],
      type_notification_enum: [
        'INSCRIPTION',
        'FORMATION',
        'SESSION',
        'PRESENCE',
        'EVALUATION',
        'ATTESTATION',
        'AGENDA',
        'PUBLICATION',
        'PAIEMENT',
        'ADMINISTRATION',
        'SYSTEME',
      ],
      type_question_enum: ['Choix unique', 'Choix multiple', 'Vrai/Faux'],
      type_reaction_enum: ["J'aime", "J'adore", 'Bravo', 'Intéressant'],
      type_retour_ia_enum: ['Positive', 'Négative'],
      visibilite_publication_enum: [
        'Public',
        'Participant',
        'Responsable',
        'Administrateur',
        'Formateur',
      ],
    },
  },
} as const
