ALTER TABLE public.support_formation
  ADD COLUMN IF NOT EXISTS session_id BIGINT REFERENCES public.session_formation(session_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS nom_fichier VARCHAR,
  ADD COLUMN IF NOT EXISTS taille_fichier BIGINT,
  ADD COLUMN IF NOT EXISTS type_support VARCHAR,
  ADD COLUMN IF NOT EXISTS cree_par BIGINT REFERENCES public.utilisateur(utilisateur_id);

CREATE INDEX IF NOT EXISTS idx_support_session ON public.support_formation(session_id);

DROP POLICY IF EXISTS "support lecture" ON public.support_formation;
DROP POLICY IF EXISTS "support gestion" ON public.support_formation;

-- Lecture : gestionnaires, formateur de la session, participant accepté de la session
CREATE POLICY "support lecture autorisee" ON public.support_formation
FOR SELECT TO authenticated
USING (
  public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM public.session_formation s
    JOIN public.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = public.utilisateur_courant_id()
  )
  OR EXISTS (
    SELECT 1 FROM public.inscription i
    JOIN public.participant p ON p.participant_id = i.participant_id
    WHERE i.session_id = support_formation.session_id
      AND i.statut = 'Acceptée'
      AND p.utilisateur_id = public.utilisateur_courant_id()
  )
);

-- Gestion : admin, responsable, ou formateur affecté à la session
CREATE POLICY "support gestion autorisee" ON public.support_formation
FOR ALL TO authenticated
USING (
  public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM public.session_formation s
    JOIN public.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = public.utilisateur_courant_id()
  )
)
WITH CHECK (
  public.a_role(auth.uid(), 'ADMINISTRATEUR') OR public.a_role(auth.uid(), 'RESPONSABLE')
  OR EXISTS (
    SELECT 1 FROM public.session_formation s
    JOIN public.formateur f ON f.formateur_id = s.formateur_id
    WHERE s.session_id = support_formation.session_id
      AND f.utilisateur_id = public.utilisateur_courant_id()
  )
);

