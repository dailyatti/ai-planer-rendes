---
name: create-component
description: Creates a new React component with proper structure, types, and styles.
---

# Create Component Skill

This skill helps you create consistent, high-quality React components in the project.

## Usage

When the user asks to "create a component" or "add a new UI element", follow these steps.

## Standards

- **Framework**: React (Functional Components)
- **Language**: TypeScript (`.tsx`)
- **Styling**: Tailwind CSS (preferred) or CSS Modules (`.module.css`) if complex custom styles are needed.
- **Icon Set**: Lucide React (`lucide-react`)
- **Export**: Named exports are preferred default exports.

## Template

Use the following structure for new components:

```tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming a utility for class merging exists, otherwise omit

interface ComponentNameProps {
  className?: string;
  // Add other props here
}

export const ComponentName: React.FC<ComponentNameProps> = ({ className, ...props }) => {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {/* Component content */}
    </div>
  );
};
```

## Checklist

1.  [ ] Create the file in `src/components/` (or a specific subdirectory if requested).
2.  [ ] Define the Props interface.
3.  [ ] Implement the component.
4.  [ ] Add a story or example usage if applicable (or if requested).
5.  [ ] Ensure all imports are absolute (e.g., `@/components...`) if alias is configured, or relative otherwise.
