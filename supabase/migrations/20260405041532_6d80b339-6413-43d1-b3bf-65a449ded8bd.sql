CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL DEFAULT 'healthcare',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  structured_data JSONB,
  emotion TEXT,
  priority_score INTEGER DEFAULT 1 CHECK (priority_score >= 1 AND priority_score <= 5),
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can select conversations"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update conversations"
  ON public.conversations FOR UPDATE
  USING (true);

CREATE INDEX idx_conversations_priority ON public.conversations (priority_score DESC);
CREATE INDEX idx_conversations_critical ON public.conversations (is_critical) WHERE is_critical = true;