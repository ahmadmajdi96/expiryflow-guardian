CREATE POLICY "Authorized roles can delete proposals"
ON public.markdown_proposals
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'store_manager'::app_role));