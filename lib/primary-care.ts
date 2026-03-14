export type PrimaryCareTemplateId =
  | "annual_wellness"
  | "hypertension_followup"
  | "diabetes_followup"
  | "preventive_visit";

export type PrimaryCareTemplateInput = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  bloodPressure?: string;
  bmi?: string;
  a1c?: string;
  smokingStatus?: string;
};

export type PreventiveGapRecommendation = {
  gap_type: string;
  due_date: string;
  rationale: string;
};

function isoDateFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function yearsSinceDob(dob: string): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function diagnosisCodeForTemplate(templateId: PrimaryCareTemplateId): string {
  switch (templateId) {
    case "annual_wellness":
      return "Z00.00";
    case "hypertension_followup":
      return "I10";
    case "diabetes_followup":
      return "E11.9";
    case "preventive_visit":
      return "Z00.01";
    default:
      return "Z00.00";
  }
}

export function buildPrimaryCareNote(
  templateId: PrimaryCareTemplateId,
  input: PrimaryCareTemplateInput,
): string {
  const titleByTemplate: Record<PrimaryCareTemplateId, string> = {
    annual_wellness: "Annual Wellness Visit",
    hypertension_followup: "Hypertension Follow-up",
    diabetes_followup: "Diabetes Follow-up",
    preventive_visit: "Preventive Primary Care Visit",
  };

  const vitals = [
    input.bloodPressure ? `Blood pressure: ${input.bloodPressure}` : null,
    input.bmi ? `BMI: ${input.bmi}` : null,
    input.a1c ? `A1c: ${input.a1c}` : null,
    input.smokingStatus ? `Smoking status: ${input.smokingStatus}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `Template: ${titleByTemplate[templateId]}`,
    "",
    "S: Subjective",
    input.subjective || "-",
    "",
    "O: Objective",
    input.objective || "-",
    vitals ? `\nVitals\n${vitals}` : "",
    "",
    "A: Assessment",
    input.assessment || "-",
    "",
    "P: Plan",
    input.plan || "-",
  ]
    .filter(Boolean)
    .join("\n");
}

export function primaryCareRecommendations(dob: string): PreventiveGapRecommendation[] {
  const age = yearsSinceDob(dob);

  const base: PreventiveGapRecommendation[] = [
    {
      gap_type: "Annual wellness exam",
      due_date: isoDateFromNow(30),
      rationale: "Primary care annual preventive follow-up.",
    },
    {
      gap_type: "Blood pressure screening",
      due_date: isoDateFromNow(30),
      rationale: "Routine cardiovascular risk screening.",
    },
  ];

  if (age >= 45) {
    base.push({
      gap_type: "Colorectal cancer screening",
      due_date: isoDateFromNow(60),
      rationale: "USPSTF age-based preventive recommendation.",
    });
  }

  if (age >= 40) {
    base.push({
      gap_type: "Lipid panel",
      due_date: isoDateFromNow(45),
      rationale: "Atherosclerotic risk evaluation in primary care.",
    });
  }

  if (age >= 50) {
    base.push({
      gap_type: "Influenza and vaccine review",
      due_date: isoDateFromNow(30),
      rationale: "Seasonal and age-based immunization review.",
    });
  }

  return base;
}
