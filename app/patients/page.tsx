import { revalidatePath } from "next/cache";
import { writeAuditEvent } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { PageHeader } from "@/components/page-header";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Gender, Patient } from "@/lib/types";

const genders: Gender[] = ["male", "female", "other", "unknown"];

async function createPatient(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const dob = String(formData.get("dob") ?? "").trim();
  const gender = String(formData.get("gender") ?? "unknown") as Gender;
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const insuranceProvider = String(formData.get("insurance_provider") ?? "").trim();
  const insuranceMemberId = String(formData.get("insurance_member_id") ?? "").trim();
  const portalPassword = String(formData.get("portal_password") ?? "");

  if (!firstName || !lastName || !dob) {
    return;
  }

  const passwordHash =
    portalPassword.trim().length >= 6 ? hashPassword(portalPassword.trim()) : null;

  const insertRes = await supabase
    .from("patients")
    .insert({
      first_name: firstName,
      last_name: lastName,
      dob,
      gender: genders.includes(gender) ? gender : "unknown",
      phone: phone || null,
      email: email || null,
      insurance_provider: insuranceProvider || null,
      insurance_member_id: insuranceMemberId || null,
      password_hash: passwordHash,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "patient.create",
      actor_role: "staff",
      entity_type: "patients",
      entity_id: insertRes.data.id,
      metadata: { email: email || null },
    });
  }

  revalidatePath("/");
  revalidatePath("/patients");
  revalidatePath("/appointments");
  revalidatePath("/medical-records");
  revalidatePath("/billing");
  revalidatePath("/lab-results");
  revalidatePath("/primary-care");
  revalidatePath("/prescriptions");
  revalidatePath("/patient-portal/appointments");
  revalidatePath("/patient-portal/lab-results");
  revalidatePath("/patient-portal/messages");
}

export default async function PatientsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Patients"
          description="Centralized patient demographics, history, insurance, and contact details."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="stack">
      <PageHeader
        title="Patients"
        description="Create and manage patient records used across scheduling, documentation, labs, and billing."
      />

      <article className="panel">
        <h3>Add Patient</h3>
        <form action={createPatient} className="stack" style={{ marginTop: "0.8rem" }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="first_name">First Name</label>
              <input id="first_name" name="first_name" required />
            </div>

            <div className="field">
              <label htmlFor="last_name">Last Name</label>
              <input id="last_name" name="last_name" required />
            </div>

            <div className="field">
              <label htmlFor="dob">Date of Birth</label>
              <input id="dob" name="dob" type="date" required />
            </div>

            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" defaultValue="unknown">
                {genders.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" placeholder="+1 555 555 5555" />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" />
            </div>

            <div className="field">
              <label htmlFor="insurance_provider">Insurance Provider</label>
              <input id="insurance_provider" name="insurance_provider" />
            </div>

            <div className="field">
              <label htmlFor="insurance_member_id">Insurance Member ID</label>
              <input id="insurance_member_id" name="insurance_member_id" />
            </div>

            <div className="field">
              <label htmlFor="portal_password">Portal Password (Optional)</label>
              <input id="portal_password" name="portal_password" type="password" minLength={6} />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Patient
            </button>
          </div>
        </form>
      </article>

      <article className="panel panel-muted">
        <h3>Patient Portal Passwords</h3>
        <p className="notice" style={{ marginTop: "0.75rem" }}>
          Manual portal passwords are stored as secure hashes in the patient table.
          Set during patient creation or through <strong>/patient-portal/login</strong>{" "}
          using Set Password mode.
        </p>
      </article>

      <article className="panel">
        <h3>Patient Directory</h3>

        {error ? <p className="notice notice-error">Failed to load patients: {error.message}</p> : null}

        {!error && (patients ?? []).length === 0 ? <p className="notice">No patients found. Add your first record above.</p> : null}

        {(patients ?? []).length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Insurance</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(patients as Patient[]).map((patient) => (
                  <tr key={patient.id}>
                    <td>{patientDisplayName(patient)}</td>
                    <td>{formatDate(patient.dob)}</td>
                    <td>
                      <span className="badge">{patient.gender}</span>
                    </td>
                    <td>
                      <div>{patient.phone || "-"}</div>
                      <div className="small">{patient.email || "-"}</div>
                    </td>
                    <td>
                      <div>{patient.insurance_provider || "-"}</div>
                      <div className="small">{patient.insurance_member_id || "-"}</div>
                    </td>
                    <td>{formatDate(patient.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
