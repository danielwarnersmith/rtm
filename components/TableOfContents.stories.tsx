import type { Meta, StoryObj } from '@storybook/react';
import { TableOfContents } from './TableOfContents';
import { useEffect } from 'react';

// Mock article element with headings for TOC to work
function TableOfContentsWithMockContent() {
  useEffect(() => {
    // Create a mock article element with headings
    const article = document.createElement('article');
    article.innerHTML = `
      <h1 id="introduction">1. Introduction</h1>
      <h2 id="getting-started">1.1 Getting Started</h2>
      <h2 id="basic-concepts">1.2 Basic Concepts</h2>
      <h1 id="sound-design">2. Sound Design</h1>
      <h2 id="oscillators">2.1 Oscillators</h2>
      <h2 id="filters">2.2 Filters</h2>
      <h3 id="filter-types">2.2.1 Filter Types</h3>
      <h1 id="sequencing">3. Sequencing</h1>
    `;
    document.body.appendChild(article);
    
    return () => {
      document.body.removeChild(article);
    };
  }, []);

  return <TableOfContents />;
}

const meta = {
  title: 'Components/TableOfContents',
  component: TableOfContents,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TableOfContentsWithMockContent />,
};

