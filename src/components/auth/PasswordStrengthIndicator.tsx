"use client";

import { getPasswordStrength } from "@/lib/validation/auth";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const strengthColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
];

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score - 1 ? strengthColors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs ${
          score <= 1
            ? "text-red-600"
            : score === 2
            ? "text-yellow-600"
            : "text-green-600"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
