export type AllergyRow = {
  allergen: string;
  reaction: string | null;
  severity: string;
};

export type ActiveMedicationRow = {
  medication_name: string;
  dosage: string;
};

export type SafetyAlert = {
  severity: "moderate" | "high";
  message: string;
};

const interactionPairs: Array<{
  a: string;
  b: string;
  severity: "moderate" | "high";
  message: string;
}> = [
  {
    a: "warfarin",
    b: "aspirin",
    severity: "high",
    message: "Increased bleeding risk with warfarin and aspirin combination.",
  },
  {
    a: "lisinopril",
    b: "potassium",
    severity: "moderate",
    message: "ACE inhibitor with potassium products may increase hyperkalemia risk.",
  },
  {
    a: "metformin",
    b: "contrast",
    severity: "moderate",
    message: "Review renal function timing around iodinated contrast and metformin.",
  },
  {
    a: "simvastatin",
    b: "clarithromycin",
    severity: "high",
    message: "Potential statin toxicity with strong CYP3A4 inhibitor co-administration.",
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function includesEither(left: string, right: string, patternA: string, patternB: string): boolean {
  return (
    (left.includes(patternA) && right.includes(patternB)) ||
    (left.includes(patternB) && right.includes(patternA))
  );
}

export function evaluatePrescriptionSafety(input: {
  medicationName: string;
  allergies: AllergyRow[];
  activeMedications: ActiveMedicationRow[];
}): SafetyAlert[] {
  const medication = normalize(input.medicationName);
  const alerts: SafetyAlert[] = [];

  input.allergies.forEach((allergy) => {
    const allergen = normalize(allergy.allergen);
    if (allergen && medication.includes(allergen)) {
      alerts.push({
        severity: allergy.severity === "severe" ? "high" : "moderate",
        message: `Allergy alert: medication matches allergen '${allergy.allergen}'.`,
      });
    }
  });

  input.activeMedications.forEach((activeMedication) => {
    const existing = normalize(activeMedication.medication_name);

    interactionPairs.forEach((pair) => {
      if (includesEither(medication, existing, pair.a, pair.b)) {
        alerts.push({
          severity: pair.severity,
          message: `Drug interaction with '${activeMedication.medication_name}': ${pair.message}`,
        });
      }
    });
  });

  return alerts;
}

export function collapseSafetyAlerts(alerts: SafetyAlert[]): string | null {
  if (alerts.length === 0) {
    return null;
  }

  return alerts.map((alert) => `[${alert.severity.toUpperCase()}] ${alert.message}`).join(" | ");
}

export function suggestedPrescriptionStatus(alerts: SafetyAlert[]): "active" | "pending_review" {
  return alerts.length > 0 ? "pending_review" : "active";
}
