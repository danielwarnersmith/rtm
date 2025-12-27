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

export const WithLink: Story = {
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-4 py-2 text-left">Section</th>
            <th className="px-4 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="#introduction">1. Introduction</a>
            </td>
            <td className="px-4 py-2">Getting started with the device</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="#sound-design">2. Sound Design</a>
            </td>
            <td className="px-4 py-2">Creating and shaping sounds</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="#sequencing">3. Sequencing</a>
            </td>
            <td className="px-4 py-2">Building patterns and sequences</td>
          </ClickableTableRow>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Click on any row to navigate to the linked section. The entire row is clickable.
      </p>
    </div>
  ),
};

export const WithoutLink: Story = {
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-4 py-2 text-left">Parameter</th>
            <th className="px-4 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <ClickableTableRow>
            <td className="px-4 py-2">Volume</td>
            <td className="px-4 py-2">50%</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">Frequency</td>
            <td className="px-4 py-2">440 Hz</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">Decay</td>
            <td className="px-4 py-2">1.2s</td>
          </ClickableTableRow>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Rows without links are not clickable and don&apos;t show hover effects.
      </p>
    </div>
  ),
};

export const MixedTable: Story = {
  render: () => (
      <div className="prose dark:prose-invert max-w-none">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-4 py-2 text-left">Number</th>
              <th className="px-4 py-2 text-left">Section</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <ClickableTableRow>
              <td className="px-4 py-2">1.</td>
              <td className="px-4 py-2">
                <a href="#introduction">Introduction</a>
              </td>
              <td className="px-4 py-2">Complete</td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">2.</td>
              <td className="px-4 py-2">Overview</td>
              <td className="px-4 py-2">In Progress</td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">3.</td>
              <td className="px-4 py-2">
                <a href="#sound-design">Sound Design</a>
              </td>
              <td className="px-4 py-2">Complete</td>
            </ClickableTableRow>
            <ClickableTableRow>
              <td className="px-4 py-2">4.</td>
              <td className="px-4 py-2">
                <a href="#sequencing">Sequencing</a>
              </td>
              <td className="px-4 py-2">Pending</td>
            </ClickableTableRow>
          </tbody>
        </table>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          This table has a mix of clickable rows (with links) and non-clickable rows.
          Hover over rows with links to see the interactive styling.
        </p>
      </div>
    ),
};

export const ShouldHide: Story = {
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-4 py-2 text-left">Item</th>
            <th className="px-4 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="#visible">Visible Row</a>
            </td>
            <td className="px-4 py-2">Shown</td>
          </ClickableTableRow>
          <ClickableTableRow shouldHide>
            <td className="px-4 py-2">
              <a href="#hidden">Hidden Row</a>
            </td>
            <td className="px-4 py-2">Not rendered</td>
          </ClickableTableRow>
          <ClickableTableRow>
            <td className="px-4 py-2">
              <a href="#visible2">Another Visible Row</a>
            </td>
            <td className="px-4 py-2">Shown</td>
          </ClickableTableRow>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Rows with <code>shouldHide</code> prop are not rendered (useful for conditional table rows).
      </p>
    </div>
  ),
};

