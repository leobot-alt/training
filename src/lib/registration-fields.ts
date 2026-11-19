export const REGISTRATION_FIELD_GROUPS = [
  {
    title: 'Dados pessoais e contato',
    fields: [
      { key: 'rg', label: 'RG', requiredByDefault: true },
      { key: 'sexo', label: 'Sexo', requiredByDefault: true },
      { key: 'email', label: 'E-mail', requiredByDefault: true },
      { key: 'emailTeams', label: 'E-mail Microsoft Teams', requiredByDefault: true },
      { key: 'telefone', label: 'Telefone', requiredByDefault: true },
      { key: 'cep', label: 'CEP', requiredByDefault: true },
      { key: 'endereco', label: 'Endereço', requiredByDefault: true },
      { key: 'numero', label: 'Número e complemento', requiredByDefault: true },
      { key: 'cidade', label: 'Cidade', requiredByDefault: true },
      { key: 'uf', label: 'UF', requiredByDefault: true },
      { key: 'chavePix', label: 'Chave Pix', requiredByDefault: true },
    ],
  },
  {
    title: 'Formação e perfil profissional',
    fields: [
      { key: 'registro', label: 'Registro profissional', requiredByDefault: true },
      { key: 'experienciaAnos', label: 'Anos de experiência clínica', requiredByDefault: true },
      { key: 'abordagem', label: 'Abordagens clínicas', requiredByDefault: true },
      { key: 'especialidades', label: 'Especialidades', requiredByDefault: true },
      { key: 'bio', label: 'Resumo profissional', requiredByDefault: false },
    ],
  },
  {
    title: 'Disponibilidade',
    fields: [
      { key: 'agenda', label: 'Agenda de disponibilidade', requiredByDefault: true },
    ],
  },
] as const;

export type RegistrationFieldKey = (typeof REGISTRATION_FIELD_GROUPS)[number]['fields'][number]['key'];
export type RegistrationFieldRules = Record<RegistrationFieldKey, boolean>;

export const DEFAULT_REGISTRATION_FIELDS = Object.fromEntries(
  REGISTRATION_FIELD_GROUPS.flatMap((group) => group.fields.map(({ key, requiredByDefault }) => [key, requiredByDefault])),
) as RegistrationFieldRules;

export function normalizeRegistrationFields(value: unknown): RegistrationFieldRules {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(
    REGISTRATION_FIELD_GROUPS.flatMap((group) => group.fields.map(({ key, requiredByDefault }) => [
      key,
      typeof source[key] === 'boolean' ? source[key] : requiredByDefault,
    ])),
  ) as RegistrationFieldRules;
}

export const FIXED_REQUIRED_REGISTRATION_FIELDS = [
  { label: 'Nome completo', reason: 'Identificação do cadastro.' },
  { label: 'CPF', reason: 'Identificação e usuário de acesso.' },
  { label: 'Data de nascimento', reason: 'Senha de acesso do profissional.' },
  { label: 'Profissão', reason: 'Define o tipo de registro profissional.' },
  { label: 'Consentimento LGPD', reason: 'Confirmação necessária para tratar os dados enviados.' },
] as const;
