/** Parse comma, semicolon, or newline separated env values. */
export function parseEnvList(value?: string): string[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .split(/[,;\n]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    ),
  ];
}
