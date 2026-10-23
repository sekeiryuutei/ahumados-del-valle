export function pageHead(title: string, description = `${title} de Ahumados del Valle. Portal operativo de demostración.`) {
  const full = `${title} · Ahumados del Valle`;
  return { meta: [{ title: full }, { name: 'description', content: description }, { property: 'og:title', content: full }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}
