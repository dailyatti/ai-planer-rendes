export const DOMAIN_EXTENSIONS = [
  '.com', '.net', '.org', '.edu', '.gov', '.mil', '.int',
  '.co', '.io', '.ai', '.app', '.dev', '.tech', '.pro',
  '.biz', '.info', '.name', '.mobi', '.tel', '.travel',
  '.eu', '.uk', '.de', '.fr', '.it', '.es', '.nl', '.be',
  '.au', '.ca', '.jp', '.cn', '.ru', '.br', '.mx', '.in',
  '.hu', '.cz', '.sk', '.pl', '.at', '.ch', '.se', '.no',
  '.dk', '.fi', '.pt', '.gr', '.tr', '.il', '.za', '.eg',
  '.ng', '.ke', '.ma', '.tn', '.dz', '.ly', '.sd', '.et'
];

export const detectLinks = (text: string): string => {
  // Enhanced regex pattern to detect URLs with various protocols and domain extensions
  const urlPattern = new RegExp(
    `(https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&=]*)|` +
    `(?:^|\\s)((?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}(?:${DOMAIN_EXTENSIONS.join('|').replace(/\./g, '\\.')})\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&=]*)))`,
    'gi'
  );

  return text.replace(urlPattern, (match, url1, url2) => {
    const url = url1 || url2;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline transition-colors duration-200">${displayUrl}</a>`;
  });
};

export const linkifyText = (text: string): string => {
  return detectLinks(text);
};