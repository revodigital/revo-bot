export function formatSources(matches: any[]) {
  return matches.length
    ? matches?.map((match, index) => {
        const {
          filename = `Documento #${index + 1}`,
          url = "",
          similarity = null,
        } = match;
        return { filename, url, similarity };
      })
    : [];
}
