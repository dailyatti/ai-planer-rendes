export const parseMoneyInput = (raw: string | number | undefined | null): number => {
    if (raw === undefined || raw === null || raw === '') return 0;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;

    const s = String(raw).trim().replace(/\s/g, '');
    if (!s) return 0;

    // Determine last separator to distinguish decimals
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    // Heuristic:
    // If both exist, the one that is later is likely the decimal separator.
    // Example: 1,234.56 -> decimal is .
    // Example: 1.234,56 -> decimal is ,
    // If only one exists:
    //   - If it's a comma, it might be decimal (EU) or thousands (US) - tough ambiguity.
    //   - BUT typically in finance input, if someone types "123,45" they mean decimal.
    //   - If "1,234" they might mean 1234.
    //   - The user provided a logic: "match last separator".

    // We'll follow the user's robust logic:
    const decimalSep = lastComma > lastDot ? ',' : '.';

    // If no separator found, it's integer-like, just parse.
    if (lastComma === -1 && lastDot === -1) {
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    const normalized = s
        .replace(new RegExp(`\\${decimalSep}(?=[^${decimalSep}]*$)`), 'DECIMAL') // last sep -> DECIMAL
        .replace(/[.,]/g, '') // remove other separators
        .replace('DECIMAL', '.')
        .replace(/[^0-9.-]/g, ''); // remove anything else

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
};
