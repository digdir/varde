export const SITE_NAME = 'Varde';

export interface PageMetadata {
  title: string;
  description?: string;
}

/**
 * Build the meta descriptor array React Router's `meta` export expects.
 * Kept intentionally small – extend with og/twitter tags as needed.
 */
export const generateMetadata = ({ title, description }: PageMetadata) => [
  { title: `${title} - ${SITE_NAME}` },
  ...(description ? [{ name: 'description', content: description }] : []),
];
