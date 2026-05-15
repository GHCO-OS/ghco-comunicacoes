export type WhatsAppFormatInput = {
  title?: string;
  body?: string;
  quotes?: string[];
  footer?: string;
};

export function formatWhatsAppText(input: WhatsAppFormatInput): string {
  const sections: string[] = [];
  const title = cleanLine(input.title);
  const body = cleanBlock(input.body);
  const quotes = (input.quotes ?? []).map(cleanLine).filter(Boolean);
  const footer = cleanBlock(input.footer);

  if (title) {
    sections.push(`*${title}*`);
  }

  if (body) {
    sections.push(`_${body}_`);
  }

  if (quotes.length > 0) {
    sections.push(quotes.map((quote) => `> ${quote}`).join("\n"));
  }

  if (footer) {
    sections.push(footer);
  }

  return sections.join("\n\n");
}

function cleanLine(value: string | undefined): string {
  return cleanBlock(value).replace(/\s+/g, " ").trim();
}

function cleanBlock(value: string | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}
