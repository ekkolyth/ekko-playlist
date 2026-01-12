import { useRouterState } from "@tanstack/react-router";
import { useSearch } from "@/hooks/use-search";
import { SearchInput } from "./search-input";

export function HeaderSearch() {
  const router = useRouterState();
  
  // Use useSearch hook which syncs with URL - pages also read from URL
  // This way both HeaderSearch and pages share the same URL state
  const [debouncedSearchValue, setSearchValue, searchValue] = useSearch('', 300, true);
  
  // Determine placeholder based on current route
  const pathname = router.location.pathname;
  const isPlaylistPage = pathname.includes('/app/playlists/') && pathname !== '/app/playlists';
  const placeholder = isPlaylistPage
    ? "Search videos in this playlist..."
    : "Search videos by title or channel...";
  
  return (
    <SearchInput
      value={searchValue}
      onChange={setSearchValue}
      placeholder={placeholder}
      aria-label="Search videos"
      className="max-w-md"
    />
  );
}