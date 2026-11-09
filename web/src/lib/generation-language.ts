export function generationLanguageInstruction(language?: "ko" | "en"): string {
  const name = language === "en" ? "English" : "Korean";
  return `Output language: ${name}. Write all user-facing chat, task questions, judgments, storyline, headlines, body copy and notes in ${name}. Set task-analysis language to ${language === "en" ? "en" : "ko"}. Keep JSON keys, IDs, schema enum values (including Korean enums), evidence references, URLs, exact source quotations and proper names unchanged. Use concise English section names within the schema's 8-character limit. Language choice does not permit inventing facts or translating verbatim evidence quotations.`;
}
