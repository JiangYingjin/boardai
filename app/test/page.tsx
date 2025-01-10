import React from 'react';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';
import styles from './math.module.css';

const markdownToHtml = (markdown: string): string => {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  }).use(markdownItKatex, {
    throwOnError: false,
    displayMode: true
  });

  return md.render(markdown);
};

// 示例 Markdown 内容，注意数学公式的格式
const markdownContent = `
## 变量代换法

行内公式示例：$\\int f(x) \\, dx$，其中 $x = g(t)$

块级公式：

$$
\\int f(x) \\, dx = \\int f(g(t)) \\cdot g^\\prime(t) \\, dt
$$

### 推导过程

1. 设 $F(x)$ 是 $f(x)$ 的原函数
2. 则有：
   $$
   F'(x) = f(x)
   $$
`;

export default function Home() {
  const content = markdownToHtml(markdownContent);

  return (
    <div className={styles.container}>
      <div
        dangerouslySetInnerHTML={{ __html: content }}
        className={styles.mathContent}
      />
    </div>
  );
}
