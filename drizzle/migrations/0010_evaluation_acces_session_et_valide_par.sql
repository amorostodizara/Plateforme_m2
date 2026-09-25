CREATE OR REPLACE FUNCTION public.peut_voir_evaluation(_evaluation_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a_role(auth.uid(),'FORMATEUR') OR a_role(auth.uid(),'RESPONSABLE') OR a_role(auth.uid(),'ADMINISTRATEUR')
  OR EXISTS (
    SELECT 1 FROM evaluation e
    JOIN inscription i ON i.session_id = e.session_id AND i.statut = 'Acceptée'
    JOIN participant p ON p.participant_id = i.participant_id
    WHERE e.evaluation_id = _evaluation_id AND e.statut IN ('Publiée','Fermée')
      AND p.utilisateur_id = utilisateur_courant_id()
  );
$$;

DROP POLICY IF EXISTS "Lecture evaluation" ON public.evaluation;
CREATE POLICY "Lecture evaluation" ON public.evaluation FOR SELECT TO authenticated
  USING (public.peut_voir_evaluation(evaluation_id));

DROP POLICY IF EXISTS "Lecture questions" ON public.question_evaluation;
CREATE POLICY "Lecture questions" ON public.question_evaluation FOR SELECT TO authenticated
  USING (public.peut_voir_evaluation(evaluation_id));

DROP POLICY IF EXISTS "Lecture options" ON public.option_question;
CREATE POLICY "Lecture options" ON public.option_question FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.question_evaluation q WHERE q.question_evaluation_id = option_question.question_evaluation_id AND public.peut_voir_evaluation(q.evaluation_id)));

ALTER TABLE public.paiement_formateur ADD COLUMN IF NOT EXISTS valide_par bigint REFERENCES public.responsable(responsable_id) ON DELETE SET NULL;