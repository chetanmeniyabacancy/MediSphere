export type Gender = "male" | "female" | "other" | "unknown";

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled";

export type ClaimStatus = "draft" | "submitted" | "paid" | "rejected";

export type SenderRole = "patient" | "provider" | "staff";

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          dob: string;
          gender: Gender;
          phone: string | null;
          email: string | null;
          password_hash: string | null;
          insurance_provider: string | null;
          insurance_member_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          dob: string;
          gender?: Gender;
          phone?: string | null;
          email?: string | null;
          password_hash?: string | null;
          insurance_provider?: string | null;
          insurance_member_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          dob?: string;
          gender?: Gender;
          phone?: string | null;
          email?: string | null;
          password_hash?: string | null;
          insurance_provider?: string | null;
          insurance_member_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          provider_name: string;
          scheduled_at: string;
          status: AppointmentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          provider_name: string;
          scheduled_at: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          patient_id?: string;
          provider_name?: string;
          scheduled_at?: string;
          status?: AppointmentStatus;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      clinical_notes: {
        Row: {
          id: string;
          patient_id: string;
          provider_name: string;
          encounter_date: string;
          diagnosis_code: string | null;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          provider_name: string;
          encounter_date: string;
          diagnosis_code?: string | null;
          note: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          patient_id?: string;
          provider_name?: string;
          encounter_date?: string;
          diagnosis_code?: string | null;
          note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_claims: {
        Row: {
          id: string;
          patient_id: string;
          appointment_id: string | null;
          cpt_code: string;
          icd10_code: string;
          amount: number;
          status: ClaimStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          appointment_id?: string | null;
          cpt_code: string;
          icd10_code: string;
          amount: number;
          status?: ClaimStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          patient_id?: string;
          appointment_id?: string | null;
          cpt_code?: string;
          icd10_code?: string;
          amount?: number;
          status?: ClaimStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      lab_results: {
        Row: {
          id: string;
          patient_id: string;
          test_name: string;
          result_value: string;
          reference_range: string | null;
          collected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          test_name: string;
          result_value: string;
          reference_range?: string | null;
          collected_at: string;
          created_at?: string;
        };
        Update: {
          patient_id?: string;
          test_name?: string;
          result_value?: string;
          reference_range?: string | null;
          collected_at?: string;
        };
        Relationships: [];
      };
      patient_messages: {
        Row: {
          id: string;
          patient_id: string;
          sender_role: SenderRole;
          subject: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          sender_role?: SenderRole;
          subject: string;
          body: string;
          created_at?: string;
        };
        Update: {
          sender_role?: SenderRole;
          subject?: string;
          body?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type ClinicalNote = Database["public"]["Tables"]["clinical_notes"]["Row"];
export type BillingClaim = Database["public"]["Tables"]["billing_claims"]["Row"];
export type LabResult = Database["public"]["Tables"]["lab_results"]["Row"];
export type PatientMessage = Database["public"]["Tables"]["patient_messages"]["Row"];
