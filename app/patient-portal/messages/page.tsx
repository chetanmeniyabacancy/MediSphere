import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/page-header";
import { getLoggedInPatient } from "@/lib/auth/patient-session";
import { formatDateTime, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { PatientMessage } from "@/lib/types";

async function sendPatientMessage(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  const patient = await getLoggedInPatient();

  if (!supabase || !patient) {
    return;
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject || !body) {
    return;
  }

  await supabase.from("patient_messages").insert({
    patient_id: patient.id,
    sender_role: "patient",
    subject,
    body,
  });

  revalidatePath("/patient-portal/messages");
  revalidatePath("/reports");
}

export default async function PortalMessagesPage() {
  const supabase = getSupabaseServerClient();
  const patient = await getLoggedInPatient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Portal Messages"
          description="Secure communication channel between patients and clinic teams."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  if (!patient) {
    return (
      <section className="stack">
        <PageHeader
          title="Portal Messages"
          description="Secure communication channel between patients and clinic teams."
        />
        <article className="panel">
          <p className="notice">Please log in to view and send messages.</p>
          <div className="form-actions" style={{ marginTop: "0.75rem" }}>
            <Link className="button" href="/patient-portal/login">
              Go to Login
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const { data, error } = await supabase
    .from("patient_messages")
    .select("id, patient_id, sender_role, subject, body, created_at")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(120);

  const messages = (data ?? []) as PatientMessage[];

  return (
    <section className="stack">
      <PageHeader
        title="Portal Messages"
        description="Patients can send non-urgent communication to clinic staff."
      />

      <article className="panel">
        <h3>Send Message</h3>
        <p className="small" style={{ marginTop: "0.4rem" }}>
          Patient: {patientDisplayName(patient)}
        </p>
        <form action={sendPatientMessage} className="stack" style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required />
          </div>
          <div className="field">
            <label htmlFor="body">Message</label>
            <textarea id="body" name="body" required />
          </div>
          <div className="form-actions">
            <button type="submit" className="button">
              Send Message
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Conversation</h3>

        {error ? <p className="notice notice-error">Failed to load messages: {error.message}</p> : null}

        {!error && messages.length === 0 ? <p className="notice">No messages found.</p> : null}

        {messages.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sent</th>
                  <th>Role</th>
                  <th>Subject</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>{formatDateTime(message.created_at)}</td>
                    <td>
                      <span className="badge">{message.sender_role}</span>
                    </td>
                    <td>{message.subject}</td>
                    <td>{message.body}</td>
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
