import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/app/AuthProvider';
import { localAuth } from '@/data/local/localAuth';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div>dashboard-marker</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('validates the form before submitting', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
  });

  it('surfaces an error for wrong credentials (Journey A)', async () => {
    const user = userEvent.setup();
    await localAuth.signUp({ email: 'hunter@example.com', password: 'correct-horse', displayName: 'Hunter' });
    await localAuth.signOut();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'hunter@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
    expect(screen.queryByText('dashboard-marker')).not.toBeInTheDocument();
  });

  it('signs in with valid credentials and routes to the app (Journey A)', async () => {
    const user = userEvent.setup();
    await localAuth.signUp({ email: 'hunter@example.com', password: 'correct-horse', displayName: 'Hunter' });
    await localAuth.signOut();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'hunter@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-horse');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('dashboard-marker')).toBeInTheDocument());
  });

  it('persists the session across reloads (Journey D)', async () => {
    await localAuth.signUp({ email: 'hunter@example.com', password: 'correct-horse', displayName: 'Hunter' });
    await localAuth.signOut();
    await localAuth.signIn({ email: 'hunter@example.com', password: 'correct-horse' });
    const session = await localAuth.getSession();
    expect(session?.user.email).toBe('hunter@example.com');

    await localAuth.signOut();
    expect(await localAuth.getSession()).toBeNull();
  });
});
