/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Enterprise Management System — Canonical Types & Role Matrix
 * Covers RBAC (8 organizational roles), Staff & Access Management, CEO Executive
 * Command Center, Manager Workspace, Department Workspaces, Tuition & Installment
 * Financial Management, Automated Alerts, and Immutable Audit Trails.
 */

export const PRIMARY_SUPER_ADMIN_EMAIL = 'mzhmd924@gmail.com';
export const ENTERPRISE_BUSINESS_TIMEZONE = 'Asia/Seoul';
export const ENTERPRISE_DEFAULT_CURRENCY = 'KRW';

export type EnterpriseRole =
  | 'super_admin'
  | 'ceo'
  | 'manager'
  | 'admin'
  | 'counsellor'
  | 'application_officer'
  | 'finance_officer'
  | 'viewer';

export const ALL_ENTERPRISE_ROLES: readonly EnterpriseRole[] = [
  'super_admin',
  'ceo',
  'manager',
  'admin',
  'counsellor',
  'application_officer',
  'finance_officer',
  'viewer',
] as const;

export type EnterpriseDepartmentId =
  | 'executive'
  | 'operations'
  | 'counselling'
  | 'admissions'
  | 'finance'
  | 'administration'
  | 'compliance';

export interface EnterpriseDepartment {
  id: EnterpriseDepartmentId;
  name: string;
  description: string;
  defaultRoles: EnterpriseRole[];
}

export const ENTERPRISE_DEPARTMENTS: readonly EnterpriseDepartment[] = [
  {
    id: 'executive',
    name: 'Executive Leadership',
    description: 'CEO oversight, strategic reporting, and company-wide business intelligence.',
    defaultRoles: ['super_admin', 'ceo'],
  },
  {
    id: 'operations',
    name: 'Operations & Management',
    description: 'Workload balancing, SLA enforcement, team escalations, and deadline tracking.',
    defaultRoles: ['manager'],
  },
  {
    id: 'counselling',
    name: 'Student Counselling',
    description: 'Lead onboarding, student follow-ups, university matching, and readiness preparation.',
    defaultRoles: ['counsellor'],
  },
  {
    id: 'admissions',
    name: 'Admissions & Application Processing',
    description: 'Document verification, AI extraction review, university submissions, and decisions.',
    defaultRoles: ['application_officer'],
  },
  {
    id: 'finance',
    name: 'Finance & Tuition Operations',
    description: 'Tuition accounts, installment schedules, payment verification, scholarships, and reconciliation.',
    defaultRoles: ['finance_officer'],
  },
  {
    id: 'administration',
    name: 'Department Administration',
    description: 'Department-level staff coordination, university configuration, and workflow administration.',
    defaultRoles: ['admin'],
  },
  {
    id: 'compliance',
    name: 'Audit & Observer',
    description: 'Read-only visibility into explicitly authorized departments and reporting scopes.',
    defaultRoles: ['viewer'],
  },
] as const;

export type EnterpriseAccessScope =
  | 'global'
  | 'department'
  | 'university'
  | 'assigned_only';

export type EnterprisePermission =
  | 'system.configure'
  | 'system.security_policies'
  | 'roles.manage_super_admin'
  | 'roles.manage_all'
  | 'roles.manage_department_staff'
  | 'roles.view_directory'
  | 'dashboard.ceo_read'
  | 'dashboard.manager_read'
  | 'dashboard.admin_read'
  | 'dashboard.counselling_workspace'
  | 'dashboard.application_workspace'
  | 'dashboard.finance_workspace'
  | 'dashboard.viewer_read'
  | 'applications.read_all'
  | 'applications.read_department'
  | 'applications.read_assigned'
  | 'applications.assign'
  | 'applications.process_assigned'
  | 'applications.approve_status'
  | 'applications.request_documents'
  | 'applications.review_passport_assigned'
  | 'applications.review_passport_unrestricted'
  | 'applications.escalate'
  | 'leads.read_all'
  | 'leads.read_assigned'
  | 'leads.create'
  | 'leads.update_assigned'
  | 'tasks.read_all'
  | 'tasks.read_assigned'
  | 'tasks.create_assign'
  | 'tasks.create_followup'
  | 'tasks.update_own'
  | 'tasks.escalate'
  | 'finance.read_summary'
  | 'finance.read_detailed'
  | 'finance.create_account'
  | 'finance.manage_installments'
  | 'finance.record_payment'
  | 'finance.verify_payment'
  | 'finance.reconcile_payment'
  | 'finance.manage_scholarships'
  | 'finance.request_correction'
  | 'finance.approve_correction'
  | 'finance.view_audit_logs'
  | 'reports.export_executive'
  | 'reports.export_operations'
  | 'reports.export_financial'
  | 'audit.read_all'
  | 'alerts.read'
  | 'alerts.manage';

export type StaffAssignmentStatus =
  | 'active'
  | 'pending_invitation'
  | 'suspended'
  | 'revoked';

export interface StaffRoleAssignment {
  uid: string;
  email: string;
  displayName: string;
  role: EnterpriseRole;
  department: EnterpriseDepartmentId;
  accessScope: EnterpriseAccessScope;
  assignedUniversities: string[];
  assignedDepartments: EnterpriseDepartmentId[];
  supervisorUid?: string | null;
  supervisorName?: string | null;
  status: StaffAssignmentStatus;
  roleVersion: number;
  permissionVersion: number;
  isPrimarySuperAdmin?: boolean;
  assignedByUid?: string;
  assignedByEmail?: string;
  createdAt: string;
  updatedAt: string;
  lastClaimSyncAt?: string;
}

export interface StaffRoleHistoryEvent {
  eventId: string;
  targetUid: string;
  targetEmail: string;
  targetName: string;
  action:
    | 'role_assigned'
    | 'role_updated'
    | 'role_revoked'
    | 'status_changed'
    | 'invitation_created'
    | 'super_admin_bootstrap'
    | 'emergency_recovery_audit';
  previousRole: EnterpriseRole | null;
  newRole: EnterpriseRole | null;
  previousDepartment: EnterpriseDepartmentId | null;
  newDepartment: EnterpriseDepartmentId | null;
  previousRoleVersion: number;
  newRoleVersion: number;
  actorUid: string;
  actorEmail: string;
  actorRole: EnterpriseRole;
  reason: string;
  timestamp: string;
}

export interface StaffInvitationRecord {
  invitationId: string;
  email: string;
  displayName: string;
  proposedRole: EnterpriseRole;
  department: EnterpriseDepartmentId;
  accessScope: EnterpriseAccessScope;
  assignedUniversities: string[];
  supervisorUid?: string | null;
  supervisorName?: string | null;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invitedByUid: string;
  invitedByEmail: string;
  notes?: string;
  createdAt: string;
  expiresAt: string;
}

export interface VerifiedEnterpriseCaller {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: EnterpriseRole;
  department: EnterpriseDepartmentId;
  accessScope: EnterpriseAccessScope;
  assignedUniversities: string[];
  assignedDepartments: EnterpriseDepartmentId[];
  roleVersion: number;
  permissionVersion: number;
  isPrimarySuperAdmin: boolean;
  permissions: EnterprisePermission[];
  claimsSyncNeeded: boolean;
  idToken: string;
}

// ============================================================================
// FINANCIAL MANAGEMENT TYPES
// ============================================================================

export type PaymentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'correction_requested';

export type PaymentMethodType =
  | 'bank_transfer'
  | 'wire_international'
  | 'card'
  | 'cash_office'
  | 'scholarship_credit'
  | 'other';

export type AccountPaymentStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'refunded';

export interface FinancialInstallment {
  installmentId: string;
  accountId: string;
  installmentNumber: number;
  label?: string;
  expectedAmount: number;
  actualAmountPaid: number; // strictly verified payments applied to this installment
  pendingAmount: number; // submitted but unverified payments
  outstandingAmount: number; // max(0, expectedAmount - actualAmountPaid)
  dueDate: string; // YYYY-MM-DD
  expectedPaymentDate?: string | null;
  actualPaymentDate?: string | null;
  paymentMethod?: PaymentMethodType | null;
  receiptUrl?: string | null;
  receiptStoragePath?: string | null;
  receiptFileName?: string | null;
  verificationStatus: PaymentVerificationStatus;
  verifiedByUid?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinancialTransactionType =
  | 'payment'
  | 'scholarship_adjustment'
  | 'discount_adjustment'
  | 'correction'
  | 'refund';

export interface FinancialTransaction {
  transactionId: string;
  idempotencyKey: string;
  accountId: string;
  installmentId?: string | null;
  studentUid: string;
  studentName: string;
  universityId: string;
  universityName: string;
  intake: string;
  type: FinancialTransactionType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  paymentDate: string; // YYYY-MM-DD (actual payment date)
  referenceNumber?: string;
  receiptUrl?: string | null;
  receiptStoragePath?: string | null;
  receiptFileName?: string | null;
  verificationStatus: PaymentVerificationStatus;
  recordedByUid: string;
  recordedByName: string;
  recordedByEmail: string;
  verifiedByUid?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  reconciled: boolean;
  reconciledByUid?: string | null;
  reconciledByName?: string | null;
  reconciledAt?: string | null;
  correctionOfTransactionId?: string | null;
  correctionReason?: string | null;
  notes?: string;
  createdAt: string;
}

export interface StudentFinancialAccount {
  accountId: string;
  studentUid: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  applicationId?: string | null;
  universityId: string;
  universityName: string;
  intake: string;
  currency: string;
  totalTuitionFee: number;
  scholarshipAmount: number;
  approvedDiscount: number;
  totalPayableAmount: number; // totalTuitionFee - scholarshipAmount - approvedDiscount
  totalVerifiedPaid: number; // strictly verified payments only
  totalPendingUnverified: number; // pending payments NOT counted as collected revenue
  remainingBalance: number; // max(0, totalPayableAmount - totalVerifiedPaid)
  overdueAmount: number;
  paymentStatus: AccountPaymentStatus;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  installmentsCount: number;
  createdByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAuditLogEntry {
  eventId: string;
  accountId: string;
  transactionId?: string | null;
  installmentId?: string | null;
  action:
    | 'account_created'
    | 'installment_created'
    | 'payment_recorded'
    | 'payment_verified'
    | 'payment_rejected'
    | 'payment_reconciled'
    | 'scholarship_updated'
    | 'discount_updated'
    | 'correction_created'
    | 'duplicate_payment_blocked';
  actorUid: string;
  actorEmail: string;
  actorRole: EnterpriseRole;
  amount?: number;
  previousBalance?: number;
  newBalance?: number;
  summary: string;
  reason?: string;
  timestamp: string;
}

// ============================================================================
// TASKS, COUNSELLING LEADS & ALERTS
// ============================================================================

export type StaffTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type StaffTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'escalated';

export interface StaffTaskComment {
  commentId: string;
  authorUid: string;
  authorName: string;
  authorRole: EnterpriseRole;
  text: string;
  createdAt: string;
}

export interface StaffTaskEscalation {
  escalationId: string;
  escalatedByUid: string;
  escalatedByName: string;
  escalatedToRole: 'manager' | 'ceo' | 'super_admin';
  reason: string;
  createdAt: string;
}

export interface StaffTaskRecord {
  taskId: string;
  title: string;
  description: string;
  assignedToUid: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedToRole?: EnterpriseRole;
  department: EnterpriseDepartmentId;
  relatedStudentUid?: string | null;
  relatedStudentName?: string | null;
  relatedApplicationId?: string | null;
  universityId?: string | null;
  universityName?: string | null;
  priority: StaffTaskPriority;
  status: StaffTaskStatus;
  createdDate: string;
  dueDate: string; // YYYY-MM-DD
  completionDate?: string | null;
  createdByUid: string;
  createdByName: string;
  comments: StaffTaskComment[];
  escalationHistory: StaffTaskEscalation[];
  updatedAt: string;
}

export type CounsellingLeadStatus =
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'preparing_documents'
  | 'application_started'
  | 'converted'
  | 'lost';

export interface CounsellingLeadNote {
  noteId: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface CounsellingLeadRecord {
  leadId: string;
  studentName: string;
  studentUid?: string | null;
  email: string;
  phone: string;
  nationality: string;
  preferredUniversities: string[];
  desiredIntake: string;
  desiredDegree: string;
  counsellingStatus: CounsellingLeadStatus;
  assignedCounsellorUid: string;
  assignedCounsellorName: string;
  assignedCounsellorEmail: string;
  followUpDate?: string | null; // YYYY-MM-DD
  readinessStatus: 'not_started' | 'in_progress' | 'documents_missing' | 'ready';
  relatedApplicationId?: string | null;
  notes: CounsellingLeadNote[];
  createdAt: string;
  updatedAt: string;
}

export type ManagementAlertType =
  | 'deadline_approaching'
  | 'missing_documents'
  | 'application_overdue'
  | 'tuition_overdue'
  | 'installment_upcoming'
  | 'payment_unverified'
  | 'application_unassigned'
  | 'task_deadline'
  | 'university_response_delayed'
  | 'processing_delay';

export type ManagementAlertSeverity = 'critical' | 'high' | 'medium';

export interface ManagementAlertItem {
  alertId: string;
  type: ManagementAlertType;
  severity: ManagementAlertSeverity;
  title: string;
  description: string;
  department: EnterpriseDepartmentId;
  universityId?: string | null;
  universityName?: string | null;
  relatedApplicationId?: string | null;
  relatedAccountId?: string | null;
  relatedTaskId?: string | null;
  responsibleStaffUid?: string | null;
  responsibleStaffName?: string | null;
  dueDate?: string | null;
  daysOverdueOrRemaining?: number | null;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

// ============================================================================
// DATE FILTERING & EXECUTIVE REPORTING
// ============================================================================

export type DateFilterPreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export type DateDimensionField =
  | 'createdAt'
  | 'documentCompletedAt'
  | 'submittedAt'
  | 'decisionAt'
  | 'dueDate'
  | 'actualPaymentDate';

export interface EnterpriseReportFilters {
  datePreset?: DateFilterPreset;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  dateField?: DateDimensionField;
  universityId?: string;
  intake?: string;
  department?: EnterpriseDepartmentId | '';
  staffUid?: string;
  status?: string;
  timezone?: string;
}

export interface UniversityPerformanceRow {
  universityId: string;
  universityName: string;
  shortCode: string;
  isFeaturedPartner: boolean;
  totalApplications: number;
  completedApplications: number;
  inProgressApplications: number;
  documentsPending: number;
  submittedApplications: number;
  underReviewApplications: number;
  decisionsCount: number;
  acceptedStudents: number;
  rejectedStudents: number;
  withdrawnApplications: number;
  conversionRatePct: number;
  totalTuitionObligations: number;
  tuitionCollectedVerified: number;
  tuitionPendingUnverified: number;
  tuitionOutstanding: number;
  upcomingPayments30d: number;
  overduePayments: number;
  collectionRatePct: number;
  intakeBreakdown: Array<{
    intake: string;
    totalApplications: number;
    accepted: number;
    submitted: number;
    tuitionExpected: number;
    tuitionCollected: number;
    tuitionOutstanding: number;
  }>;
}

export interface StaffPerformanceRow {
  uid: string;
  name: string;
  email: string;
  role: EnterpriseRole;
  department: EnterpriseDepartmentId;
  leadsAssigned: number;
  studentsRegistered: number;
  applicationsCompleted: number;
  applicationsPending: number;
  applicationsSubmitted: number;
  acceptedCount: number;
  rejectedCount: number;
  followUpActivities: number;
  overdueTasks: number;
  completedTasks: number;
  documentCompletionRatePct: number;
  avgProcessingDays: number | null;
  conversionRatePct: number;
}

export interface FinancialCommandSummary {
  currency: string;
  accountsCount: number;
  totalTuitionBilled: number;
  totalScholarships: number;
  totalApprovedDiscounts: number;
  totalExpectedTuition: number; // sum(totalPayableAmount)
  totalVerifiedCollected: number; // strictly verified payments only
  totalPendingUnverified: number; // explicitly separated from collected revenue
  totalOutstanding: number; // totalExpectedTuition - totalVerifiedCollected
  dueWithin7Days: number;
  dueWithin15Days: number;
  dueWithin30Days: number;
  overdueAmount: number;
  overdueAccountsCount: number;
  unverifiedTransactionsCount: number;
  collectionRatePct: number;
  byUniversity: Array<{
    universityId: string;
    universityName: string;
    accountsCount: number;
    expected: number;
    collectedVerified: number;
    pendingUnverified: number;
    outstanding: number;
    overdue: number;
    collectionRatePct: number;
  }>;
  byIntake: Array<{
    intake: string;
    accountsCount: number;
    expected: number;
    collectedVerified: number;
    outstanding: number;
    collectionRatePct: number;
  }>;
}

export interface CeoDashboardPayload {
  generatedAt: string;
  timezone: string;
  appliedFilters: EnterpriseReportFilters;
  resolvedDateRange: { from: string | null; to: string | null };
  companyOverview: {
    totalStudents: number;
    totalRegisteredAccounts: number;
    totalStudentLeads: number;
    totalApplications: number;
    applicationsCompleted: number;
    applicationsPending: number;
    applicationsSubmitted: number;
    applicationsUnderReview: number;
    acceptedApplications: number;
    rejectedApplications: number;
    withdrawnApplications: number;
    missingDocumentsCount: number;
    conversionRatePct: number;
    avgProcessingDays: number | null;
  };
  universityPerformance: UniversityPerformanceRow[];
  financialSummary: FinancialCommandSummary;
  staffPerformance: {
    counsellors: StaffPerformanceRow[];
    applicationOfficers: StaffPerformanceRow[];
    allStaff: StaffPerformanceRow[];
  };
  departmentSummary: Array<{
    department: EnterpriseDepartmentId;
    name: string;
    activeStaffCount: number;
    openTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
    openAlertsCount: number;
  }>;
  alerts: ManagementAlertItem[];
  availableFilters: {
    universities: Array<{ id: string; name: string }>;
    intakes: string[];
    staff: Array<{ uid: string; name: string; role: EnterpriseRole; department: EnterpriseDepartmentId }>;
  };
}
