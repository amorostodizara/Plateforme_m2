CREATE TYPE public.type_retour_ia_enum AS ENUM ('Positive', 'Négative');

CREATE TABLE public.conversation_ia (
  conversation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  titre TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.message_ia (
  message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversation_ia(conversation_id) ON DELETE CASCADE,
  role_message TEXT NOT NULL,
  contenu TEXT NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.retour_ia (
  retour_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES public.message_ia(message_id) ON DELETE CASCADE,
  utilisateur_id BIGINT NOT NULL REFERENCES public.utilisateur(utilisateur_id) ON DELETE CASCADE,
  type_retour public.type_retour_ia_enum NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, utilisateur_id)
);

CREATE INDEX idx_conversation_ia_utilisateur ON public.conversation_ia(utilisateur_id);
CREATE INDEX idx_message_ia_conversation ON public.message_ia(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_ia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_ia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retour_ia TO authenticated;
GRANT ALL ON public.conversation_ia TO service_role;
GRANT ALL ON public.message_ia TO service_role;
GRANT ALL ON public.retour_ia TO service_role;

ALTER TABLE public.conversation_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retour_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_ia proprietaire" ON public.conversation_ia
  FOR ALL TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = public.utilisateur_courant_id());

CREATE POLICY "message_ia proprietaire" ON public.message_ia
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversation_ia c WHERE c.conversation_id = message_ia.conversation_id AND c.utilisateur_id = public.utilisateur_courant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversation_ia c WHERE c.conversation_id = message_ia.conversation_id AND c.utilisateur_id = public.utilisateur_courant_id()));

CREATE POLICY "retour_ia proprietaire" ON public.retour_ia
  FOR ALL TO authenticated
  USING (utilisateur_id = public.utilisateur_courant_id())
  WITH CHECK (utilisateur_id = public.utilisateur_courant_id());