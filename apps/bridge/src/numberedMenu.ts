export type NumberedMenuOption = {
  label: string;
  responseText: string;
};

export type NumberedMenuInput = {
  title?: string;
  body: string;
  options: NumberedMenuOption[];
  footer?: string;
};

export function formatNumberedMenu(input: NumberedMenuInput): string {
  const sections: string[] = [];
  const title = cleanLine(input.title);
  const body = cleanBlock(input.body);
  const footer = cleanBlock(input.footer);

  if (title) {
    sections.push(`*${title}*`);
  }

  sections.push(body);
  sections.push(input.options.map((option, index) => `${index + 1}. ${cleanLine(option.label)}`).join("\n"));

  if (footer) {
    sections.push(footer);
  }

  sections.push("Responda somente com o numero da opcao.");
  return sections.join("\n\n");
}

export function parseNumberedMenuReply(text: string | null): number | null {
  const match = text?.trim().match(/^(\d{1,2})$/);
  return match ? Number(match[1]) : null;
}

function cleanLine(value: string | undefined): string {
  return cleanBlock(value).replace(/\s+/g, " ").trim();
}

function cleanBlock(value: string | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}
