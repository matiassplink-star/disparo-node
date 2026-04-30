-- ============================================================
-- ZapLink: Sistema de Disparos em Massa (Campaigns)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de Campanhas (Campaigns)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  name text NOT NULL,
  message_template text NOT NULL,
  media_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'error')),
  delay_min int NOT NULL DEFAULT 15,
  delay_max int NOT NULL DEFAULT 30,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Leads da Campanha (Campaign Leads)
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_log text,
  sent_at timestamp with time zone
);

-- Índices para performance na fila (Worker)
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- 3. Atualizações na tabela Contatos (para a aba Leads)
-- Garantindo que existam colunas para origens e emails (caso não existam)
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- ============================================================
-- Regras de Segurança RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Políticas para Campaigns
CREATE POLICY "Users can insert their own campaigns"
ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own campaigns"
ON public.campaigns FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Campaign Leads
-- Como campaign_leads não tem user_id, a segurança deriva do campaign_id
CREATE POLICY "Users can insert leads into their campaigns"
ON public.campaign_leads FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view leads of their campaigns"
ON public.campaign_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update leads of their campaigns"
ON public.campaign_leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete leads of their campaigns"
ON public.campaign_leads FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

-- Ativar Realtime para monitoramento na tela
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_leads;
