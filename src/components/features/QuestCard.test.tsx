import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QuestCard } from './QuestCard';
import type { QuestAssignment, QuestTemplate } from '@/core/types';

const template: QuestTemplate = {
  id: 'v-incline-pushups',
  title: 'Incline Push-Up Progression',
  description: 'Build pressing strength on a stable incline surface.',
  path: 'vitality',
  difficulty: 'medium',
  cadence: 'daily',
  durationMinutes: 15,
  instructions: ['Do the thing'],
  criteria: ['4 sets completed', 'Straight body line'],
  tags: ['push'],
  attributeWeights: { strength: 0.75 },
};

const assignment: QuestAssignment = {
  id: 'qa-1',
  ownerId: 'u1',
  templateId: template.id,
  assignedDate: '2026-10-15',
  cadence: 'daily',
  status: 'available',
  createdAt: '2026-10-15T00:00:00.000Z',
};

function renderCard(props: Partial<Parameters<typeof QuestCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <QuestCard assignment={assignment} template={template} {...props} />
    </MemoryRouter>,
  );
}

describe('QuestCard', () => {
  it('renders title, path, difficulty and reward', () => {
    renderCard();
    expect(screen.getByText('Incline Push-Up Progression')).toBeInTheDocument();
    expect(screen.getByText('Vitality')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('links to the quest detail page', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /details/i });
    expect(link).toHaveAttribute('href', '/app/quests/qa-1');
  });

  it('shows accept and complete actions for available quests', () => {
    renderCard({ onAccept: vi.fn(), onComplete: vi.fn() });
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('requires every acceptance criterion before completing', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onComplete, onAccept: vi.fn() });

    await user.click(screen.getByRole('button', { name: /complete/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /complete quest/i });
    expect(confirm).toBeDisabled();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('qa-1', { evidence: undefined, notes: undefined }));
  });

  it('lets the user attach notes before completing', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onComplete });

    await user.click(screen.getByRole('button', { name: /complete/i }));
    await screen.findByRole('dialog');
    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }

    const notes = screen.getByLabelText(/notes/i);
    await user.type(notes, 'Felt strong today.');
    await user.click(screen.getByRole('button', { name: /complete quest/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('qa-1', { evidence: undefined, notes: 'Felt strong today.' }));
  });

  it('hides completion actions for completed quests', () => {
    renderCard({
      assignment: { ...assignment, status: 'completed', xpAwarded: 25 },
      onComplete: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
    expect(screen.getByText(/\+25 XP earned/i)).toBeInTheDocument();
  });
});
