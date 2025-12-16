import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/playlists')({
  component: PlaylistsLayout,
});

function PlaylistsLayout() {
  return <Outlet />;
}
