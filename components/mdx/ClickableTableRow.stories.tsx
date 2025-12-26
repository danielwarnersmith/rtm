import type { Meta, StoryObj } from '@storybook/react';
import { ClickableTableRow } from './ClickableTableRow';

const meta = {
  title: 'MDX Components/ClickableTableRow',
  component: ClickableTableRow,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ClickableTableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAnchorLink: Story = {
  render: () => {
    // Create mock elements for anchor links to work
    if (typeof document !== 'undefined') {
      const intro = document.getElementById('introduction') || document.createElement('div');
      intro.id = 'introduction';
      intro.textContent = 'Introduction Section';
      if (!document.getElementById('introduction')) {
        document.body.appendChild(intro);
      }
      
      const design = document.getElementById('sound-design') || document.createElement('div');
      design.id = 'sound-design';
      design.textContent = 'Sound Design Section';
      if (!document.getElementById('sound-design')) {
        document.body.appendChild(design);
      }
    }
    
    return (
      <div className="prose dark:prose-invert max-w-none">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
                Section
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#introduction">1. Introduction</a>
              </td>
              <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                Getting started with the device
              </td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#sound-design">2. Sound Design</a>
              </td>
              <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                Creating and editing sounds
              </td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#sequencing">3. Sequencing</a>
              </td>
              <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                Building patterns and sequences
              </td>
            </ClickableTableRow>
          </tbody>
        </table>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Hover over rows to see the hover effect. Click a row to navigate to the section.
        </p>
      </div>
    );
  },
};

export const WithExternalLink: Story = {
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
              Resource
            </th>
            <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="https://www.elektron.se" target="_blank" rel="noopener noreferrer">
                Official Website
              </a>
            </td>
            <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
              Documentation
            </td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="https://www.elektron.se/support" target="_blank" rel="noopener noreferrer">
                Support
              </a>
            </td>
            <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
              Help & Support
            </td>
          </ClickableTableRow>
        </tbody>
      </table>
    </div>
  ),
};

export const WithoutLink: Story = {
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
              Parameter
            </th>
            <th className="border-b border-neutral-200 px-4 py-2 text-left dark:border-neutral-800">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          <ClickableTableRow>
            <td className="px-4 py-2">Volume</td>
            <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">75%</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">Frequency</td>
            <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">440 Hz</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">Decay</td>
            <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">1.5s</td>
          </ClickableTableRow>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Rows without links are not clickable and don&apos;t show hover effects.
      </p>
    </div>
  ),
};

export const InTableOfContents: Story = {
  render: () => {
    // Create mock elements
    if (typeof document !== 'undefined') {
      ['introduction', 'getting-started', 'basic-concepts'].forEach((id) => {
        if (!document.getElementById(id)) {
          const el = document.createElement('div');
          el.id = id;
          el.textContent = `${id} section`;
          document.body.appendChild(el);
        }
      });
    }
    
    return (
      <div className="prose dark:prose-invert max-w-none">
        <h2>Table of Contents</h2>
        <table className="w-full border-collapse">
          <tbody>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#introduction">1. Introduction</a>
              </td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#getting-started">1.1 Getting Started</a>
              </td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">
                <a href="#basic-concepts">1.2 Basic Concepts</a>
              </td>
            </ClickableTableRow>
          </tbody>
        </table>
      </div>
    );
  },
};

