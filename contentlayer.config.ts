import { defineDocumentType, makeSource } from "contentlayer2/source-files";
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
  },
});

