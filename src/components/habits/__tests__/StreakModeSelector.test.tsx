/**
 * StreakModeSelector — unit tests
 *
 * Verifies:
 *  1. All three streak mode options render
 *  2. onChange fires with the correct StreakMode value
 *  3. Percentage-threshold sub-fields are shown/hidden conditionally
 *  4. Preset buttons fire onPercentageThresholdChange
 *  5. Disabled state prevents interaction
 *  6. Error messages are rendered
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StreakModeSelector } from "../StreakModeSelector";
import { StreakMode } from "@/lib/streaks/types";

function renderSelector(
  overrides: Partial<Parameters<typeof StreakModeSelector>[0]> = {}
) {
  const onChange = vi.fn();
  const onPercentageThresholdChange = vi.fn();
  render(
    <StreakModeSelector
      value={StreakMode.Strict}
      onChange={onChange}
      percentageThreshold={80}
      onPercentageThresholdChange={onPercentageThresholdChange}
      {...overrides}
    />
  );
  return { onChange, onPercentageThresholdChange };
}

describe("StreakModeSelector", () => {
  it("renders all three mode options", () => {
    renderSelector();
    expect(screen.getByText("Strict")).toBeInTheDocument();
    expect(screen.getByText("One grace per week")).toBeInTheDocument();
    expect(screen.getByText("Percentage threshold")).toBeInTheDocument();
  });

  it("marks the current value as checked", () => {
    renderSelector({ value: StreakMode.OneGracePerWeek });
    const radio = screen.getByRole("radio", {
      name: /one grace per week/i,
    });
    expect(radio).toBeChecked();
  });

  it("calls onChange with Strict mode", () => {
    const { onChange } = renderSelector({ value: StreakMode.OneGracePerWeek });
    fireEvent.click(screen.getByRole("radio", { name: /strict/i }));
    expect(onChange).toHaveBeenCalledWith(StreakMode.Strict);
  });

  it("calls onChange with OneGracePerWeek mode", () => {
    const { onChange } = renderSelector();
    fireEvent.click(screen.getByRole("radio", { name: /one grace per week/i }));
    expect(onChange).toHaveBeenCalledWith(StreakMode.OneGracePerWeek);
  });

  it("calls onChange with PercentageThreshold mode", () => {
    const { onChange } = renderSelector();
    fireEvent.click(
      screen.getByRole("radio", { name: /percentage threshold/i })
    );
    expect(onChange).toHaveBeenCalledWith(StreakMode.PercentageThreshold);
  });

  it("does NOT show the percentage input when mode is Strict", () => {
    renderSelector({ value: StreakMode.Strict });
    // spinbutton role = <input type="number">
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("does NOT show the percentage input when mode is OneGracePerWeek", () => {
    renderSelector({ value: StreakMode.OneGracePerWeek });
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("shows the percentage input when mode is PercentageThreshold", () => {
    renderSelector({ value: StreakMode.PercentageThreshold });
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("renders the current threshold value in the number input", () => {
    renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 75,
    });
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("75");
  });

  it("calls onPercentageThresholdChange when user types a new value", () => {
    const { onPercentageThresholdChange } = renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 80,
    });
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "90" } });
    expect(onPercentageThresholdChange).toHaveBeenCalledWith(90);
  });

  it("clamps threshold input to 100 maximum", () => {
    const { onPercentageThresholdChange } = renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 80,
    });
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "150" } });
    expect(onPercentageThresholdChange).toHaveBeenCalledWith(100);
  });

  it("calls onPercentageThresholdChange when a preset button is clicked", () => {
    const { onPercentageThresholdChange } = renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 80,
    });
    // Preset buttons are labelled "N%" (e.g. "70%")
    fireEvent.click(screen.getByRole("button", { name: /^70%$/i }));
    expect(onPercentageThresholdChange).toHaveBeenCalledWith(70);
  });

  it("marks the active preset button with aria-pressed=true", () => {
    renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 80,
    });
    const activePreset = screen.getByRole("button", { name: /^80%$/i });
    expect(activePreset).toHaveAttribute("aria-pressed", "true");
  });

  it("marks non-active preset buttons with aria-pressed=false", () => {
    renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThreshold: 80,
    });
    const inactivePreset = screen.getByRole("button", { name: /^70%$/i });
    expect(inactivePreset).toHaveAttribute("aria-pressed", "false");
  });

  it("does not fire onChange when disabled and a radio is clicked", () => {
    const { onChange } = renderSelector({ disabled: true });
    fireEvent.click(screen.getByRole("radio", { name: /one grace per week/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders a streak mode field-level error message", () => {
    renderSelector({ error: "Please select a streak mode" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please select a streak mode"
    );
  });

  it("renders a percentage threshold error message", () => {
    renderSelector({
      value: StreakMode.PercentageThreshold,
      percentageThresholdError: "Threshold must be between 1% and 100%",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Threshold must be between 1% and 100%"
    );
  });

  it("renders the legend text", () => {
    renderSelector();
    expect(screen.getByText("Streak mode")).toBeInTheDocument();
  });

  it("renders description text for Strict mode", () => {
    renderSelector({ value: StreakMode.Strict });
    expect(
      screen.getByText(/any missed scheduled day immediately resets/i)
    ).toBeInTheDocument();
  });

  it("renders description text for OneGracePerWeek mode", () => {
    renderSelector({ value: StreakMode.OneGracePerWeek });
    expect(
      screen.getByText(/one free skip per week without breaking/i)
    ).toBeInTheDocument();
  });
});
