export class ProfileResponseDto {
  id!: string;
  username!: string;
  email!: string;
  type!: string;
  status!: string;
  first_name!: string | null;
  last_name!: string | null;
  phone!: string | null;
  address!: string | null;
  date_of_birth!: string | null;
  gender!: string | null;
  nationality!: string | null;
  state!: string | null;
  lga!: string | null;
  marital_status!: string | null;
  bio!: string | null;
  occupation!: string | null;
  avatar!: string | null;
  primary_organization_id!: string | null;
  created_at!: Date;
  updated_at!: Date;
  organizations!: Array<{
    id: string;
    name: string;
    code: string;
    is_primary: boolean;
  }>;
  groups?: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
    is_primary?: boolean;
  }>;
  teams?: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
  }>;
  employee_profile?: {
    id: string;
    employee_code: string | null;
    job_title: string | null;
    job_description: string | null;
    employment_type: string | null;
    employment_status: string | null;
    hire_date: Date | null;
    confirmation_date: Date | null;
    exit_date: Date | null;
    work_mode: string | null;
    manager: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    primary_team: {
      id: string;
      name: string;
      type: string;
    } | null;
    primary_organization: {
      id: string;
      name: string;
      code: string;
    } | null;
    meta: Record<string, unknown>;
  } | null;
  onboarding_progress?: Record<string, unknown> | null;
  signature_url?: string | null;
}
