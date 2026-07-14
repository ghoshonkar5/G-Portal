const getAuthorPosition = (authors, facultyFullName) => {
  if (!authors || !Array.isArray(authors) || authors.length === 0) return '';
  if (!facultyFullName) return '';

  // Strip honorifics: Dr., Prof., Mr., Mrs., Ms.
  const cleanedName = facultyFullName
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s*/i, '')
    .trim();

  // Handle "G.Lakshmeeswari" style — initial.lastname with no space
  // Split on dot or space
  const nameParts = cleanedName.split(/[\s.]+/).filter(Boolean);
  if (nameParts.length === 0) return '';

  const facultyLastName = nameParts[nameParts.length - 1].toLowerCase();
  const facultyInitials = nameParts.slice(0, -1).map(p => p[0].toLowerCase());
  const fullFirstName = nameParts[0]?.toLowerCase();

  const normalize = (str) =>
    str
      .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*†‡]/g, '')
      .replace(/\./g, '')
      .trim()
      .toLowerCase();

  const matchesAuthor = (rawAuthor) => {
    const author = normalize(rawAuthor);
    const parts = author.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0) return false;

    const hasLastName = parts.some(p => p === facultyLastName);
    if (!hasLastName) return false;

    const hasInitial = facultyInitials.some(initial =>
      parts.some(p => p.length === 1 && p === initial)
    );
    const hasFullFirst = parts.some(p => p === fullFirstName);

    return hasInitial || hasFullFirst;
  };

  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  for (let i = 0; i < authors.length; i++) {
    if (matchesAuthor(authors[i])) return ordinal(i + 1);
  }

  return 'N/A';
};

module.exports = { getAuthorPosition };