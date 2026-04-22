export interface SmartInput {
  title: string;
  description?: string | null;
  metric?: string | null;
  targetValue?: number | string | null;
  unit?: string | null;
  reflection?: string | null;
  deadline?: string | Date | null;
}

export interface SmartDimension {
  key: "S" | "M" | "A" | "R" | "T";
  label: string;
  met: boolean;
  hint: string;
}

export interface SmartResult {
  score: number;
  dimensions: SmartDimension[];
}

export function computeSmartScore(input: SmartInput): SmartResult {
  const { title, description, metric, targetValue, unit, reflection, deadline } = input;

  const titleOk = title.trim().length >= 10;
  const descriptionOk = !!description?.trim();
  const measurableOk =
    !!metric?.trim() && targetValue !== undefined && targetValue !== "" && !!unit?.trim();
  const achievableOk = (reflection?.trim().length ?? 0) >= 20;
  const relevantOk = (reflection?.trim().length ?? 0) >= 60;
  const timeOk = !!deadline;

  const dimensions: SmartDimension[] = [
    {
      key: "S",
      label: "Specific",
      met: titleOk && descriptionOk,
      hint:
        !titleOk
          ? "Write a title of at least 10 characters."
          : !descriptionOk
          ? "Add a description to make the goal more specific."
          : "Clear and specific.",
    },
    {
      key: "M",
      label: "Measurable",
      met: measurableOk,
      hint: measurableOk
        ? "Success metric defined."
        : "Add a metric, target value, and unit (e.g. Run / 5 / km).",
    },
    {
      key: "A",
      label: "Achievable",
      met: achievableOk,
      hint: achievableOk
        ? "Reflection recorded."
        : "Use the reflection field to explain how this goal is achievable.",
    },
    {
      key: "R",
      label: "Relevant",
      met: relevantOk,
      hint: relevantOk
        ? "Motivation and relevance explained."
        : "Expand your reflection to explain why this goal matters to you (at least a sentence).",
    },
    {
      key: "T",
      label: "Time-bound",
      met: timeOk,
      hint: timeOk ? "Deadline set." : "Set a target deadline.",
    },
  ];

  const score = dimensions.filter((d) => d.met).length;
  return { score, dimensions };
}
