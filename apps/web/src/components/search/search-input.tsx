import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FieldContent } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  return (
    <Field className={cn('w-full', className)}>
      <FieldContent className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          aria-label={ariaLabel}
        />
      </FieldContent>
    </Field>
  );
}
