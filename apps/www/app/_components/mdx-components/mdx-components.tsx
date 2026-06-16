import {
  Alert,
  Badge,
  Card,
  CardBlock,
  Details,
  DetailsContent,
  DetailsSummary,
  Divider,
  Heading,
  type HeadingProps,
  Link,
  type LinkProps,
  ListOrdered,
  type ListOrderedProps,
  ListUnordered,
  type ListUnorderedProps,
  Paragraph,
  type ParagraphProps,
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  type TableProps,
  TableRow,
} from '@digdir/designsystemet-react';
import { getMDXComponent } from 'mdx-bundler/dist/client';
import { type ComponentType, type JSX, useMemo } from 'react';
import { Link as RRLink } from 'react-router';
import classes from './mdx-components.module.css';

/** Use a client-side router link for internal paths, a plain anchor otherwise. */
const SmartLink = ({ href = '', children, ...props }: LinkProps) => {
  const isExternal =
    /^(https?:)?\/\//.test(href) ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:');

  return (
    <Link {...props} asChild>
      {isExternal ? (
        <a href={href}>{children}</a>
      ) : (
        <RRLink to={href}>{children}</RRLink>
      )}
    </Link>
  );
};

const defaultComponents = {
  Alert,
  Badge,
  Card,
  CardBlock,
  Details,
  DetailsContent,
  DetailsSummary,
  Divider,
  h1: (props: HeadingProps) => (
    <Heading className={classes.heading} level={1} data-size='xl' {...props} />
  ),
  h2: (props: HeadingProps) => (
    <Heading className={classes.heading} level={2} data-size='md' {...props} />
  ),
  h3: (props: HeadingProps) => (
    <Heading className={classes.heading} level={3} data-size='sm' {...props} />
  ),
  h4: (props: HeadingProps) => (
    <Heading className={classes.heading} level={4} data-size='xs' {...props} />
  ),
  h5: (props: HeadingProps) => (
    <Heading className={classes.heading} level={5} data-size='xs' {...props} />
  ),
  h6: (props: HeadingProps) => (
    <Heading className={classes.heading} level={6} data-size='xs' {...props} />
  ),
  p: (props: ParagraphProps) => <Paragraph {...props} />,
  ol: (props: ListOrderedProps) => <ListOrdered {...props} />,
  ul: (props: ListUnorderedProps) => <ListUnordered {...props} />,
  hr: (props: JSX.IntrinsicElements['hr']) => <Divider {...props} />,
  a: SmartLink,
  Link: SmartLink,
  pre: ({ children }: JSX.IntrinsicElements['pre']) => {
    // MDX wraps fenced code in <pre><code class="language-x">…</code></pre>.
    const codeProps =
      (children as { props?: { className?: string; children?: unknown } })
        ?.props ?? {};
    const language = (codeProps.className ?? '').replace('language-', '');
    return (
      <pre className={classes.pre} data-language={language || undefined}>
        <code className={codeProps.className}>
          {codeProps.children as React.ReactNode}
        </code>
      </pre>
    );
  },
  table: (props: TableProps) => (
    <div className={classes.tableWrapper}>
      <Table data-color='neutral' border zebra {...props} />
    </div>
  ),
  thead: TableHead,
  tbody: TableBody,
  tfoot: TableFoot,
  tr: TableRow,
  th: TableHeaderCell,
  td: TableCell,
};

export const MDXComponents = ({
  components,
  code,
}: {
  components?: Record<string, ComponentType<unknown>>;
  code?: string;
}) => {
  const Component = useMemo(() => {
    if (!code) return null;
    return getMDXComponent(code);
  }, [code]);

  if (!Component) {
    return <p>Could not load content.</p>;
  }

  return <Component components={{ ...defaultComponents, ...components }} />;
};
