import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

/**
 * Document type for machine manuals.
 * Content is sourced from /content/machines/ as MDX files.
 */
export const Machine = defineDocumentType(() => ({
  name: "Machine",
  filePathPattern: "machines/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
      description: "The title of the document",
    },
    description: {
      type: "string",
      required: false,
      description: "A brief description for SEO and previews",
    },
    tags: {
      type: "list",
      of: { type: "string" },
      required: false,
      description: "Tags for categorization and search",
    },
    date: {
      type: "date",
      required: false,
      description: "Publication date",
    },
  },
  computedFields: {
    // Generate URL-friendly slug from file path (supports nested paths)
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("machines/", ""),
    },
    // Generate full URL path for linking
    url: {
      type: "string",
      resolve: (doc) => `/machines/${doc._raw.flattenedPath.replace("machines/", "")}`,
    },
  },
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Machine],
  mdx: {
    // Enable GitHub Flavored Markdown (tables, strikethrough, etc.)
    remarkPlugins: [remarkGfm],
    // Configure rehype-pretty-code for Shiki-based syntax highlighting
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          // Use a clean, readable theme
          theme: "github-dark",
          // Keep background from theme
          keepBackground: true,
          // Add line numbers to code blocks
          onVisitLine(node: { children: unknown[] }) {
            // Prevent lines from collapsing in display: grid
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
          onVisitHighlightedLine(node: { properties: { className?: string[] } }) {
            node.properties.className = node.properties.className || [];
            node.properties.className.push("line--highlighted");
          },
          onVisitHighlightedChars(node: { properties: { className?: string[] } }) {
            node.properties.className = ["word--highlighted"];
          },
        },
      ],
    ],
  },
});

