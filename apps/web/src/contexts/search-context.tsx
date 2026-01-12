import { createContext, useContext, ReactNode } from 'react';

type SearchContextType = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  placeholder?: string;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearchContext() {
  const context = useContext(SearchContext);
  return context; // Return undefined if not found (optional context)
}

export function SearchProvider({
  searchValue,
  setSearchValue,
  placeholder,
  children,
}: SearchContextType & { children: ReactNode }) {
  return (
    <SearchContext.Provider value={{ searchValue, setSearchValue, placeholder }}>
      {children}
    </SearchContext.Provider>
  );
}
