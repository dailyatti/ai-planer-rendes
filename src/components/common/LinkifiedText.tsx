import React from 'react';
import { DOMAIN_EXTENSIONS, linkifyText } from '../../utils/linkDetection';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  preserveFormatting?: boolean;
}

const LINK_PATTERN = new RegExp(
  `https?:\\/\\/[^\\s]+|(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}(?:${DOMAIN_EXTENSIONS.join('|').replace(/\./g, '\\.')})\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&=]*)`,
  'gi',
);

const renderInlineContent = (text: string, keyPrefix: string) => {
  const matches = Array.from(text.matchAll(LINK_PATTERN));
  if (matches.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const url = match[0];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, startIndex));
    }

    const href = url.startsWith('http') ? url : `https://${url}`;
    const displayUrl = url.length > 50 ? `${url.slice(0, 47)}...` : url;

    nodes.push(
      <a
        key={`${keyPrefix}-link-${index}-${startIndex}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline transition-colors duration-200 hover:text-blue-700"
      >
        {displayUrl}
      </a>,
    );

    lastIndex = startIndex + url.length;
  });

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const renderRichText = (text: string) => {
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  const blocks = normalizedText.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n');
    const bulletLines = lines.map((line) => line.match(/^\s*[-*\u2022]\s*(.+)$/)?.[1] ?? null);
    const isBulletList = lines.length > 0 && bulletLines.every((line) => line !== null);

    if (isBulletList) {
      return (
        <ul key={`block-${blockIndex}`} className="list-disc space-y-2 pl-5">
          {bulletLines.map((line, lineIndex) => (
            <li key={`block-${blockIndex}-line-${lineIndex}`}>{renderInlineContent(line || '', `block-${blockIndex}-line-${lineIndex}`)}</li>
          ))}
        </ul>
      );
    }

    return (
      <div key={`block-${blockIndex}`} className="space-y-1.5">
        {lines.map((line, lineIndex) => (
          <div key={`block-${blockIndex}-line-${lineIndex}`} className="min-h-[1.25rem]">
            {line.trim().length > 0 ? renderInlineContent(line, `block-${blockIndex}-line-${lineIndex}`) : <span>&nbsp;</span>}
          </div>
        ))}
      </div>
    );
  });
};

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, className = '', preserveFormatting = false }) => {
  if (preserveFormatting) {
    return <div className={className}>{renderRichText(text)}</div>;
  }

  const linkedText = linkifyText(text);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: linkedText }}
    />
  );
};

export default LinkifiedText;
