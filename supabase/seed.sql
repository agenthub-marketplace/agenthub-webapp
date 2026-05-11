-- AgentHub local beta seed data.
-- These records are for local development only.

create extension if not exists pgcrypto;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'creator@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Beta Creator"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Beta Admin"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, email, display_name, role)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'creator@example.com',
    'Beta Creator',
    'creator'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'Beta Admin',
    'admin'
  )
on conflict (id) do nothing;

insert into public.creator_profiles (
  id,
  user_id,
  public_name,
  bio,
  website_url,
  verified_at
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Beta Agent Studio',
  'Specialized business agent builder focused on document-heavy workflows.',
  'https://example.com',
  now()
)
on conflict (user_id) do nothing;

insert into public.agent_categories (id, slug, name, description)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'legal-documents',
    'Legal documents',
    'Review support for contracts, policies, and legal-adjacent business documents.'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'accounting-admin',
    'Accounting & admin',
    'Administrative and accounting-adjacent document workflows.'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'hr-recruiting',
    'HR & recruiting',
    'Hiring, candidate screening, and people operations support.'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    'business-documents',
    'Business documents',
    'Proposals, reports, SOPs, and operational documents.'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    'research-analysis',
    'Research & analysis',
    'Market, competitor, and business research workflows.'
  )
on conflict (slug) do nothing;

insert into public.agents (
  id,
  creator_id,
  category_id,
  slug,
  name,
  summary,
  description,
  status,
  pricing_type,
  starting_price_cents,
  currency,
  risk_level,
  estimated_turnaround
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'contract-review-assistant',
    'Contract Review Assistant',
    'Summarizes business contracts and flags clauses to review with counsel.',
    'A professional document assistant for founders and freelancers who need a plain-English contract summary before final legal review.',
    'approved',
    'project',
    7900,
    'eur',
    'high',
    'Same business day'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'invoice-admin-assistant',
    'Invoice Admin Assistant',
    'Extracts invoice fields and prepares a clean payment tracking summary.',
    'An admin-focused agent for organizing invoices, identifying missing details, and preparing follow-up notes.',
    'approved',
    'task',
    2900,
    'eur',
    'medium',
    '2 hours'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    'market-research-brief',
    'Market Research Brief',
    'Creates concise market and competitor snapshots from public information.',
    'A research agent for consultants and small teams validating a market, niche, or productized service idea.',
    'approved',
    'project',
    12000,
    'eur',
    'medium',
    '1-2 business days'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    'candidate-screening-helper',
    'Candidate Screening Helper',
    'Prepares structured candidate summaries from resumes and job criteria.',
    'A recruiting assistant for organizing candidate information before human review.',
    'submitted',
    'task',
    4900,
    'eur',
    'high',
    'Same business day'
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'business-plan-reviewer',
    'Business Plan Reviewer',
    'Reviews business plans for clarity, gaps, and investor-readiness questions.',
    'A business document agent currently under manual review for beta publication.',
    'in_review',
    'project',
    9900,
    'eur',
    'medium',
    '1 business day'
  )
on conflict (slug) do nothing;

insert into public.agent_versions (
  id,
  agent_id,
  version_number,
  endpoint_url,
  model_notes,
  capabilities,
  required_inputs,
  deliverables,
  limitations,
  data_handling_notes,
  changelog
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    1,
    null,
    'Manual beta delivery. No arbitrary creator code is executed.',
    array['Plain-English contract summarization', 'Clause risk spotting', 'Question preparation'],
    array['Contract PDF or text', 'Business context', 'Specific concerns'],
    array['Contract summary', 'Risk checklist', 'Questions for legal counsel'],
    array['Does not provide final legal advice', 'Does not replace a qualified lawyer'],
    'High sensitivity business documents. Manual handling required in beta.',
    'Initial approved beta version'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002',
    1,
    null,
    'Manual beta delivery. No bank access or payment execution.',
    array['Invoice field extraction', 'Missing information checks', 'Payment tracking summary'],
    array['Invoice files', 'Currency', 'Optional payment status notes'],
    array['Invoice table', 'Missing field checklist', 'Follow-up notes'],
    array['Does not pay invoices', 'Does not replace accounting advice'],
    'Medium to high sensitivity invoice data.',
    'Initial approved beta version'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000003',
    1,
    null,
    'Manual beta delivery using public research sources.',
    array['Market snapshot', 'Competitor comparison', 'Opportunity notes'],
    array['Market or niche', 'Target customer', 'Research questions'],
    array['Research brief', 'Competitor comparison', 'Recommended next questions'],
    array['Does not access paid private databases', 'Does not provide investment advice'],
    'Medium sensitivity business research.',
    'Initial approved beta version'
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000004',
    1,
    null,
    'Submitted for admin validation.',
    array['Resume summary', 'Criteria matching', 'Interview question suggestions'],
    array['Resume or profile', 'Role criteria', 'Hiring constraints'],
    array['Candidate summary', 'Criteria matrix', 'Suggested questions'],
    array['Does not make hiring decisions', 'Does not infer protected attributes'],
    'High sensitivity HR data. Requires strict beta review.',
    'Initial submitted beta version'
  ),
  (
    '50000000-0000-4000-8000-000000000005',
    '40000000-0000-4000-8000-000000000005',
    1,
    null,
    'In manual review for beta publication.',
    array['Business plan critique', 'Gap detection', 'Question preparation'],
    array['Business plan document', 'Target audience', 'Known concerns'],
    array['Review memo', 'Gap list', 'Suggested improvements'],
    array['Does not provide financial advice', 'Does not guarantee fundraising outcomes'],
    'Medium sensitivity business planning data.',
    'Initial in-review beta version'
  )
on conflict (agent_id, version_number) do nothing;

update public.agents
set active_version_id = version_map.version_id
from (
  values
    (
      '40000000-0000-4000-8000-000000000001'::uuid,
      '50000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      '40000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000002'::uuid
    ),
    (
      '40000000-0000-4000-8000-000000000003'::uuid,
      '50000000-0000-4000-8000-000000000003'::uuid
    ),
    (
      '40000000-0000-4000-8000-000000000004'::uuid,
      '50000000-0000-4000-8000-000000000004'::uuid
    ),
    (
      '40000000-0000-4000-8000-000000000005'::uuid,
      '50000000-0000-4000-8000-000000000005'::uuid
    )
) as version_map(agent_id, version_id)
where public.agents.id = version_map.agent_id
  and public.agents.active_version_id is distinct from version_map.version_id;
