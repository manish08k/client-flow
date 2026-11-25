-- Apply after the generated schema migration. Tenant isolation at the database layer.
CREATE OR REPLACE FUNCTION public.is_org_member(org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org AND m.user_id = auth.uid());
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','leads','projects','tasks','invoices','invoice_items','payments','activity_logs']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id))', t || '_tenant', t);
  END LOOP;
END $$;
