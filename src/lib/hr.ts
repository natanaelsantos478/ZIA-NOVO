// ─────────────────────────────────────────────────────────────────────────────
// HR Service Layer — todas as operações de dados do módulo RH
// Substitui todos os mocks: lê/escreve direto no Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  department_id: string | null;
  company_id: string | null;
  shift_id: string | null;
  position_title: string | null;
  work_mode: string | null;
  status: string;
  contract_type: string | null;
  admission_date: string | null;
  personal_data: Record<string, unknown>;
  address_data: Record<string, unknown>;
  bank_data: Record<string, unknown>;
  created_at: string;
  departments?: { name: string } | null;
}

export interface Department {
  id: string;
  company_id: string | null;
  name: string;
  cost_center_code: string | null;
  manager_name: string | null;
  role_title: string | null;
  budget: number;
  headcount_planned: number;
  status: string;
  parent_id: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  title: string;
  level: string | null;
  cbo: string | null;
  department_id: string | null;
  department_name: string | null;
  salary_floor: number;
  salary_midpoint: number;
  salary_ceiling: number;
  work_mode: string;
  headcount_planned: number;
  headcount_current: number;
  status: string;
  created_at: string;
}

export interface Vacancy {
  id: string;
  title: string;
  dept: string | null;
  type: string;
  modality: string;
  location: string | null;
  description: string | null;
  salary: string | null;
  salary_visible: boolean;
  requirements: string | null;
  nice_to_have: string | null;
  accept_printed_resume: boolean;
  require_profile_analysis: boolean;
  desired_profiles: Record<string, boolean>;
  priority: string;
  deadline: string | null;
  stage: string;
  candidate_count: number;
  status: string;
  slug: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  vacancy_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  message: string | null;
  profile_answers: Record<string, boolean>;
  source: string;
  applied_at: string;
  status: string;
  created_at: string;
}

export interface Admission {
  id: string;
  name: string;
  cpf: string | null;
  role: string | null;
  dept: string | null;
  contract_type: string;
  start_date: string | null;
  status: string;
  completeness: number;
  form_data: Record<string, unknown>;
  created_at: string;
}

export interface Contractor {
  id: string;
  name: string;
  company: string | null;
  cnpj: string | null;
  type: string;
  role: string | null;
  dept: string | null;
  rate: string | null;
  contract_start: string | null;
  contract_end: string | null;
  nf_status: string;
  contract_status: string;
  created_at: string;
}

export interface Absence {
  id: string;
  employee_id: string | null;
  employee_name: string;
  dept: string | null;
  date: string;
  days: number;
  type: string | null;
  evidence_file: string | null;
  payroll_integration: string;
  status: string;
  justified: boolean;
  discount: string | null;
  dsr_impact: string | null;
  total_deduction: string | null;
  notified: boolean;
  created_at: string;
}

export interface Vacation {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  dept: string | null;
  admission_date: string | null;
  acquisition_start: string | null;
  acquisition_end: string | null;
  concession_deadline: string | null;
  days_available: number;
  days_sold: number;
  days_scheduled: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  third_salary: number;
  created_at: string;
}

export interface PayrollGroup {
  id: string;
  name: string;
  company_id: string | null;
  frequency: string;
  payment_day: number;
  employee_count: number;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  group_id: string | null;
  reference_month: number;
  reference_year: number;
  status: string;
  closed_at: string | null;
  created_at: string;
}

export interface PayrollItem {
  id: string;
  run_id: string | null;
  employee_id: string | null;
  employee_name: string | null;
  role: string | null;
  dept: string | null;
  salary_base: number;
  he_bonus: number;
  commissions: number;
  additionals: number;
  total_gross: number;
  inss: number;
  irrf: number;
  benefits: number;
  advances: number;
  absences_deduction: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  created_at: string;
}

export interface OnboardingProcess {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  role: string | null;
  dept: string | null;
  start_date: string | null;
  total_days: number;
  current_day: number;
  mentor_name: string | null;
  status: string;
  created_at: string;
  onboarding_steps?: OnboardingStep[];
}

export interface OnboardingStep {
  id: string;
  onboarding_id: string;
  label: string;
  done: boolean;
  due_day: number | null;
  completed_at: string | null;
}

export interface BenefitsOperator {
  id: string;
  name: string;
  type: string | null;
  api_status: string;
  last_sync: string | null;
  total_employees: number;
  monthly_cost: number;
  co_participation: boolean;
  eligibility: string[];
  discount_rule: string | null;
  created_at: string;
}

export interface EmployeeBenefit {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  position: string | null;
  has_health: boolean;
  has_dental: boolean;
  vr_daily: number;
  has_vt: boolean;
  has_life_insurance: boolean;
  has_gym: boolean;
  total_discount: number;
  co_participation_amount: number;
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string | null;
  reviewer_id: string | null;
  period_start: string | null;
  period_end: string | null;
  overall_score: number | null;
  status: string;
  review_data: Record<string, unknown>;
  created_at: string;
}

export interface TravelExpense {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  destination: string | null;
  purpose: string | null;
  departure_date: string | null;
  return_date: string | null;
  total_amount: number;
  status: string;
  items: Array<{ desc: string; value: number }>;
  created_at: string;
}

export interface OccupationalHealth {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  dept: string | null;
  exam_type: string | null;
  exam_date: string | null;
  result: string;
  valid_until: string | null;
  physician: string | null;
  created_at: string;
}

export interface Offboarding {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  role: string | null;
  dept: string | null;
  exit_date: string | null;
  reason: string | null;
  exit_type: string;
  final_salary: number;
  fgts: number;
  notice_period: string | null;
  interviewer: string | null;
  status: string;
  steps: Array<{ label: string; done: boolean }>;
  created_at: string;
}

export interface TimesheetEntry {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  date: string;
  expected_hours: string | null;
  entry_in: string | null;
  break_out: string | null;
  break_in: string | null;
  exit_out: string | null;
  worked_hours: string | null;
  balance: string | null;
  status: string;
  created_at: string;
}

export interface HrActivity {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  project: string | null;
  tags: string[];
  created_at: string;
}

export interface HourBank {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  dept: string | null;
  balance_minutes: number;
  limit_hours: number;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRequest {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  dept: string | null;
  date: string;
  hours: number;
  type: string;
  justification: string | null;
  status: string;
  approved_by: string | null;
  created_at: string;
}

export interface PunchCorrection {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  original_date: string | null;
  punch_type: string | null;
  original_time: string | null;
  corrected_time: string | null;
  justification: string | null;
  evidence_file: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
}

export interface EmployeeNote {
  id: string;
  employee_id: string | null;
  author_name: string | null;
  content: string;
  tags: string[];
  visibility: string;
  created_at: string;
}

export interface EmployeeGroup {
  id: string;
  name: string;
  description: string | null;
  type: string;
  member_count: number;
  created_at: string;
}

export interface HrAlert {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  employee_id: string | null;
  employee_name: string | null;
  dept: string | null;
  resolved: boolean;
  created_at: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}
export { fmtDate };

// ── Employees ─────────────────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .order('full_name');
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function createEmployee(payload: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select('*, departments(name)')
    .single();
  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<void> {
  const { error } = await supabase.from('employees').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function createDepartment(payload: Partial<Department>): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

// ── Positions ─────────────────────────────────────────────────────────────────

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('title');
  if (error) throw error;
  return (data ?? []) as Position[];
}

export async function createPosition(payload: Partial<Position>): Promise<Position> {
  const { data, error } = await supabase
    .from('positions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Position;
}

export async function deletePosition(id: string): Promise<void> {
  const { error } = await supabase.from('positions').delete().eq('id', id);
  if (error) throw error;
}

// ── Vacancies ─────────────────────────────────────────────────────────────────

export async function getVacancies(status?: string): Promise<Vacancy[]> {
  let q = supabase.from('vacancies').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Vacancy[];
}

export async function createVacancy(payload: Partial<Vacancy>): Promise<Vacancy> {
  const { data, error } = await supabase
    .from('vacancies')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Vacancy;
}

export async function getVacancyBySlug(slug: string): Promise<Vacancy | null> {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as Vacancy;
}

export async function getCandidatesByVacancy(vacancyId: string): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('vacancy_id', vacancyId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Candidate[];
}

export async function addCandidate(payload: Partial<Candidate>): Promise<Candidate> {
  const { data, error } = await supabase
    .from('candidates')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  // Increment candidate_count
  if (payload.vacancy_id) {
    await supabase.rpc('increment_candidate_count', { vacancy_id: payload.vacancy_id }).maybeSingle();
  }
  return data as Candidate;
}

// ── Admissions ────────────────────────────────────────────────────────────────

export async function getAdmissions(): Promise<Admission[]> {
  const { data, error } = await supabase
    .from('admissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Admission[];
}

export async function createAdmission(payload: Partial<Admission>): Promise<Admission> {
  const { data, error } = await supabase
    .from('admissions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Admission;
}

export async function updateAdmission(id: string, payload: Partial<Admission>): Promise<void> {
  const { error } = await supabase.from('admissions').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Contractors ───────────────────────────────────────────────────────────────

export async function getContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Contractor[];
}

export async function createContractor(payload: Partial<Contractor>): Promise<Contractor> {
  const { data, error } = await supabase
    .from('contractors')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Contractor;
}

export async function updateContractor(id: string, payload: Partial<Contractor>): Promise<void> {
  const { error } = await supabase.from('contractors').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Absences ──────────────────────────────────────────────────────────────────

export async function getAbsences(): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Absence[];
}

export async function createAbsence(payload: Partial<Absence>): Promise<Absence> {
  const { data, error } = await supabase
    .from('absences')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Absence;
}

export async function updateAbsence(id: string, payload: Partial<Absence>): Promise<void> {
  const { error } = await supabase.from('absences').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Vacations ─────────────────────────────────────────────────────────────────

export async function getVacations(): Promise<Vacation[]> {
  const { data, error } = await supabase
    .from('vacations')
    .select('*')
    .order('concession_deadline');
  if (error) throw error;
  return (data ?? []) as Vacation[];
}

export async function createVacation(payload: Partial<Vacation>): Promise<Vacation> {
  const { data, error } = await supabase
    .from('vacations')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Vacation;
}

export async function updateVacation(id: string, payload: Partial<Vacation>): Promise<void> {
  const { error } = await supabase.from('vacations').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function getPayrollGroups(): Promise<PayrollGroup[]> {
  const { data, error } = await supabase.from('payroll_groups').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as PayrollGroup[];
}

export async function getPayrollRuns(groupId?: string): Promise<PayrollRun[]> {
  let q = supabase
    .from('payroll_runs')
    .select('*')
    .order('reference_year', { ascending: false })
    .order('reference_month', { ascending: false });
  if (groupId) q = q.eq('group_id', groupId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PayrollRun[];
}

export async function getPayrollItems(runId: string): Promise<PayrollItem[]> {
  const { data, error } = await supabase
    .from('payroll_items')
    .select('*')
    .eq('run_id', runId)
    .order('employee_name');
  if (error) throw error;
  return (data ?? []) as PayrollItem[];
}

export async function updatePayrollItemStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('payroll_items').update({ status }).eq('id', id);
  if (error) throw error;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function getOnboardingProcesses(): Promise<OnboardingProcess[]> {
  const { data, error } = await supabase
    .from('onboarding_processes')
    .select('*, onboarding_steps(*)')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OnboardingProcess[];
}

export async function updateOnboardingStep(id: string, done: boolean): Promise<void> {
  const payload: Record<string, unknown> = { done };
  if (done) payload.completed_at = new Date().toISOString();
  const { error } = await supabase.from('onboarding_steps').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Benefits ──────────────────────────────────────────────────────────────────

export async function getBenefitsOperators(): Promise<BenefitsOperator[]> {
  const { data, error } = await supabase.from('benefits_operators').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as BenefitsOperator[];
}

export async function getEmployeeBenefits(): Promise<EmployeeBenefit[]> {
  const { data, error } = await supabase.from('employee_benefits').select('*').order('employee_name');
  if (error) throw error;
  return (data ?? []) as EmployeeBenefit[];
}

// ── Performance ───────────────────────────────────────────────────────────────

export async function getPerformanceReviews(): Promise<PerformanceReview[]> {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PerformanceReview[];
}

// ── Travel Expenses ───────────────────────────────────────────────────────────

export async function getTravelExpenses(): Promise<TravelExpense[]> {
  const { data, error } = await supabase
    .from('travel_expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TravelExpense[];
}

export async function createTravelExpense(payload: Partial<TravelExpense>): Promise<TravelExpense> {
  const { data, error } = await supabase.from('travel_expenses').insert(payload).select().single();
  if (error) throw error;
  return data as TravelExpense;
}

export async function updateTravelExpense(id: string, payload: Partial<TravelExpense>): Promise<void> {
  const { error } = await supabase.from('travel_expenses').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Occupational Health ───────────────────────────────────────────────────────

export async function getOccupationalHealth(): Promise<OccupationalHealth[]> {
  const { data, error } = await supabase
    .from('occupational_health')
    .select('*')
    .order('exam_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OccupationalHealth[];
}

export async function createOccupationalHealth(payload: Partial<OccupationalHealth>): Promise<OccupationalHealth> {
  const { data, error } = await supabase.from('occupational_health').insert(payload).select().single();
  if (error) throw error;
  return data as OccupationalHealth;
}

// ── Offboarding ───────────────────────────────────────────────────────────────

export async function getOffboardings(): Promise<Offboarding[]> {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Offboarding[];
}

// ── Timesheet ─────────────────────────────────────────────────────────────────

export async function getTimesheetEntries(employeeName?: string, month?: number, year?: number): Promise<TimesheetEntry[]> {
  let q = supabase.from('timesheet_entries').select('*').order('date');
  if (employeeName) q = q.eq('employee_name', employeeName);
  if (month && year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31`;
    q = q.gte('date', start).lte('date', end);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TimesheetEntry[];
}

// ── HR Activities ─────────────────────────────────────────────────────────────

export async function getHrActivities(): Promise<HrActivity[]> {
  const { data, error } = await supabase
    .from('hr_activities')
    .select('*')
    .order('due_date');
  if (error) throw error;
  return (data ?? []) as HrActivity[];
}

export async function createHrActivity(payload: Partial<HrActivity>): Promise<HrActivity> {
  const { data, error } = await supabase.from('hr_activities').insert(payload).select().single();
  if (error) throw error;
  return data as HrActivity;
}

export async function updateHrActivity(id: string, payload: Partial<HrActivity>): Promise<void> {
  const { error } = await supabase.from('hr_activities').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Hour Bank ─────────────────────────────────────────────────────────────────

export async function getHourBank(): Promise<HourBank[]> {
  const { data, error } = await supabase.from('hour_bank').select('*').order('employee_name');
  if (error) throw error;
  return (data ?? []) as HourBank[];
}

// ── Overtime ──────────────────────────────────────────────────────────────────

export async function getOvertimeRequests(): Promise<OvertimeRequest[]> {
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OvertimeRequest[];
}

export async function createOvertimeRequest(payload: Partial<OvertimeRequest>): Promise<OvertimeRequest> {
  const { data, error } = await supabase.from('overtime_requests').insert(payload).select().single();
  if (error) throw error;
  return data as OvertimeRequest;
}

export async function updateOvertimeRequest(id: string, payload: Partial<OvertimeRequest>): Promise<void> {
  const { error } = await supabase.from('overtime_requests').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Punch Corrections ─────────────────────────────────────────────────────────

export async function getPunchCorrections(): Promise<PunchCorrection[]> {
  const { data, error } = await supabase
    .from('punch_corrections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PunchCorrection[];
}

export async function createPunchCorrection(payload: Partial<PunchCorrection>): Promise<PunchCorrection> {
  const { data, error } = await supabase.from('punch_corrections').insert(payload).select().single();
  if (error) throw error;
  return data as PunchCorrection;
}

export async function updatePunchCorrection(id: string, payload: Partial<PunchCorrection>): Promise<void> {
  const { error } = await supabase.from('punch_corrections').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getEmployeeNotes(employeeId?: string): Promise<EmployeeNote[]> {
  let q = supabase.from('employee_notes').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EmployeeNote[];
}

export async function createEmployeeNote(payload: Partial<EmployeeNote>): Promise<EmployeeNote> {
  const { data, error } = await supabase.from('employee_notes').insert(payload).select().single();
  if (error) throw error;
  return data as EmployeeNote;
}

// ── Employee Groups ───────────────────────────────────────────────────────────

export async function getEmployeeGroups(): Promise<EmployeeGroup[]> {
  const { data, error } = await supabase.from('employee_groups').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as EmployeeGroup[];
}

export async function createEmployeeGroup(payload: Partial<EmployeeGroup>): Promise<EmployeeGroup> {
  const { data, error } = await supabase.from('employee_groups').insert(payload).select().single();
  if (error) throw error;
  return data as EmployeeGroup;
}

// ── HR Alerts ─────────────────────────────────────────────────────────────────

export async function getHrAlerts(resolved?: boolean): Promise<HrAlert[]> {
  let q = supabase.from('hr_alerts').select('*').order('created_at', { ascending: false });
  if (resolved !== undefined) q = q.eq('resolved', resolved);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HrAlert[];
}

export async function resolveHrAlert(id: string): Promise<void> {
  const { error } = await supabase.from('hr_alerts').update({ resolved: true }).eq('id', id);
  if (error) throw error;
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export interface Schedule {
  id: string;
  company_id: string | null;
  name: string;
  type: string | null;
  entry_time: string | null;
  exit_time: string | null;
  break_minutes: number;
  tolerance_min: number;
  workdays: string[];
  weekly_hours: number | null;
  color: string;
  active: boolean;
  created_at: string;
}

export interface SalaryHistory {
  id: string;
  employee_id: string | null;
  salary: number;
  effective_on: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface PositionHistory {
  id: string;
  employee_id: string | null;
  position_title: string;
  department: string | null;
  effective_on: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase.from('schedules').select('*').eq('active', true).order('name');
  if (error) throw error;
  return (data ?? []) as Schedule[];
}

export async function createSchedule(payload: Partial<Schedule>): Promise<Schedule> {
  const { data, error } = await supabase.from('schedules').insert(payload).select().single();
  if (error) throw error;
  return data as Schedule;
}

export async function updateSchedule(id: string, payload: Partial<Schedule>): Promise<void> {
  const { error } = await supabase.from('schedules').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteSchedule(id: string): Promise<void> {
  await supabase.from('employees').update({ shift_id: null }).eq('shift_id', id);
  const { error } = await supabase.from('schedules').update({ active: false }).eq('id', id);
  if (error) throw error;
}

export async function getEmployeesBySchedule(scheduleId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .eq('shift_id', scheduleId)
    .order('full_name');
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function assignScheduleToEmployee(employeeId: string, scheduleId: string | null): Promise<void> {
  const { error } = await supabase.from('employees').update({ shift_id: scheduleId }).eq('id', employeeId);
  if (error) throw error;
}

export async function getSalaryHistory(employeeId: string): Promise<SalaryHistory[]> {
  const { data, error } = await supabase
    .from('salary_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_on', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SalaryHistory[];
}

export async function addSalaryHistory(payload: Partial<SalaryHistory>): Promise<SalaryHistory> {
  const { data, error } = await supabase.from('salary_history').insert(payload).select().single();
  if (error) throw error;
  return data as SalaryHistory;
}

export async function getPositionHistory(employeeId: string): Promise<PositionHistory[]> {
  const { data, error } = await supabase
    .from('position_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_on', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PositionHistory[];
}

export async function addPositionHistory(payload: Partial<PositionHistory>): Promise<PositionHistory> {
  const { data, error } = await supabase.from('position_history').insert(payload).select().single();
  if (error) throw error;
  return data as PositionHistory;
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const id = `v${Date.now().toString().slice(-3)}`;
  return `${id}-${base}`;
}
