export interface Claim {
  id: string;
  patient_name: string;
  carrier: string;
  amount: number;
  status: string;
  missing_info: string | null;
  denial_reason: string | null;
  submitted_at: string;
}

export interface FollowUp {
  id: string;
  claim_id: string;
  task_description: string;
  due_date: string;
  status: string;
  created_at: string;
}
