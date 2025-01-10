import React from 'react';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';
import styles from '@/app/components/math.module.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const markdownToHtml = (markdown: string): string => {
  console.log('Markdown content:', markdown);

  console.log('Initializing MarkdownIt with options...');
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  }).use(markdownItKatex, {
    throwOnError: true,
    displayMode: true,
    delimiters: [
      { left: '$$', right: '$$', display: true }, // 默认块级公式
      { left: '\\[', right: '\\]', display: true }, // 支持 \[ 和 \]
      { left: '\[', right: '\]', display: true }, // 支持 \[ 和 \]
      { left: '\\(', right: '\\)', display: false }, // 支持 \( 和 \)
      { left: '\(', right: '\)', display: false }, // 支持 \( 和 \)
    ],
  });
  console.log('MarkdownIt initialized with options:', md);

  console.log('Converting markdown to HTML...');
  const html = md.render(markdown);
  console.log('Conversion complete. HTML content:', html);

  return html;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  console.log(' Markdown content...');
  const htmlContent = markdownToHtml(content);
  console.log('Rendered HTML content:', htmlContent);

  return (
    <div className={styles.container}>
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className={styles.mathContent}
      />
    </div>
  );
};

export default MarkdownRenderer;