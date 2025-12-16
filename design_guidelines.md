# Nano Admin - Design Guidelines

## Design Approach

**Selected Approach**: Design System (Shadcn/ui) with inspiration from Linear, Vercel Dashboard, and Stripe Dashboard

**Core Principles**:
- Clarity and efficiency over visual flair
- Data-dense without feeling cluttered
- Consistent, predictable patterns
- Professional and trustworthy aesthetic

## Typography

**Font Family**: 
- Primary: `font-sans` (Inter or system fonts via Tailwind)
- Monospace: `font-mono` for API keys, codes, and technical data

**Hierarchy**:
- Page Titles: `text-3xl font-bold`
- Section Headers: `text-2xl font-semibold`
- Card Titles: `text-lg font-semibold`
- Body Text: `text-sm` or `text-base`
- Labels: `text-sm font-medium`
- Metadata/Captions: `text-xs text-muted-foreground`
- Stats Numbers: `text-4xl font-bold`

## Layout System

**Spacing Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistency
- Component padding: `p-4` to `p-8`
- Section gaps: `gap-6` to `gap-8`
- Page margins: `px-6 py-8` or `p-8`

**Grid Structure**:
- Dashboard Stats: 4-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- Data Tables: Full-width with responsive horizontal scroll
- Forms: Single column with `max-w-2xl`
- Settings Panels: 2-column layout (`grid-cols-1 lg:grid-cols-3` - sidebar + content)

## Core Components

### Navigation
**Sidebar (Desktop)**:
- Fixed left sidebar, width `w-64`
- Logo/branding at top with `h-16` header
- Navigation items with `py-2 px-4` spacing
- Icons from Heroicons (outline style)
- Active state: subtle background with border-left accent
- Collapsible sections for nested navigation

**Top Bar**:
- Height `h-16`, fixed position
- Contains: breadcrumbs, search, notifications, user menu
- Right-aligned utility items with `gap-4`

**Mobile Navigation**:
- Hamburger menu that opens slide-out drawer
- Full-screen overlay when open

### Dashboard Components

**Stat Cards**:
- Grid layout with `gap-6`
- Each card: `rounded-lg border p-6`
- Structure: Icon (top-left), Label, Large number, Change indicator
- Hover: subtle lift with `hover:shadow-lg transition-shadow`

**Activity Feed**:
- List with `divide-y` separator
- Each item: Avatar + Content + Timestamp
- Timestamp: `text-xs text-muted-foreground` aligned right
- Max height with `overflow-y-auto`

**Charts/Graphs**:
- Use placeholder divs with `aspect-video` or `h-64`
- Border and rounded corners matching card style
- Comment: `<!-- CHART: User growth over time -->`

### Data Tables

**Structure**:
- Container: `rounded-lg border overflow-hidden`
- Header row: `bg-muted/50 font-medium text-sm`
- Rows: `hover:bg-muted/50 transition-colors`
- Cell padding: `px-4 py-3`
- Alternating rows: No stripe pattern (cleaner look)

**Features**:
- Sort indicators in headers (chevron icons)
- Search bar above table: `mb-4` with icon
- Pagination below: centered, `mt-4`
- Row actions: right-aligned dropdown menu
- Bulk actions: checkbox column + action bar

**Responsive**:
- Desktop: Full table
- Mobile: Card-based layout showing key info only

### Forms

**Layout**:
- Form container: `max-w-2xl space-y-6`
- Field groups: `space-y-2`
- Label: `text-sm font-medium mb-2`
- Input: `w-full px-3 py-2 rounded-md border`
- Helper text: `text-xs text-muted-foreground mt-1`
- Error state: red border + error text below

**Form Types**:
- Login/Signup: Centered card, `max-w-md mx-auto`
- User Edit: Side-by-side 2-column on desktop
- API Key Create: Modal dialog with form

### Modals & Dialogs

**Structure**:
- Overlay: semi-transparent backdrop
- Content: centered card with `max-w-lg`
- Header: `text-xl font-semibold p-6 border-b`
- Body: `p-6`
- Footer: `p-6 border-t flex justify-end gap-2`

**Types**:
- Confirmation: Small, focused message
- Forms: Medium size with validation
- Details: Can be larger with tabs

### Buttons

**Variants**:
- Primary: Solid, used for main actions
- Secondary: Outline, used for secondary actions
- Ghost: Minimal, used for tertiary actions
- Destructive: For delete/remove actions

**Sizing**: 
- Small: `px-3 py-1.5 text-sm`
- Default: `px-4 py-2 text-sm`
- Large: `px-6 py-3 text-base`

**States**:
- All buttons have hover, focus, and disabled states
- Loading state: spinner + disabled

### Cards

**Standard Card**:
- Border with `rounded-lg`
- Padding: `p-6`
- Header: `mb-4 pb-4 border-b`
- Hover effect on interactive cards

**Compact Card**:
- For list items: `p-4 rounded-md`

### Authentication Pages

**Layout**:
- Centered vertically and horizontally
- Card container: `max-w-md w-full p-8`
- Logo/branding at top center
- Form below with `space-y-6`
- Links at bottom for alternate actions

**Signup with Verification**:
- Step 1: Email/Password form
- Step 2: Verification code input (large, centered)
- Step 3: "Pending Admin Approval" success screen
- Progress indicator at top showing steps

### API Keys Page

**Layout**:
- Header with "Create API Key" button
- Table showing: Name, Key (truncated/masked), Status, Last Used, Actions
- Each row: Toggle switch for enable/disable
- Copy button for API key
- Delete in overflow menu

### Activity Log

**Timeline Style**:
- Vertical timeline with connecting line
- Each entry: Icon + Action description + User + Timestamp
- Filtering options at top: Date range, User, Action type
- Infinite scroll or pagination

## Animations

**Minimal Usage**:
- Page transitions: None or very subtle fade
- Component interactions: `transition-colors duration-200`
- Modal entry/exit: subtle fade + scale
- Loading states: simple spinner, no elaborate animations

## Accessibility

- All interactive elements have focus states with visible outline
- Form inputs have associated labels
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout
- Semantic HTML structure

## Responsive Breakpoints

- Mobile: `base` (default)
- Tablet: `md:` (768px)
- Desktop: `lg:` (1024px)
- Large: `xl:` (1280px)

**Mobile Adaptations**:
- Sidebar becomes drawer
- Multi-column grids stack to single column
- Tables convert to card views
- Reduced padding: `p-4` instead of `p-8`

## Icons

**Library**: Heroicons (outline style for navigation, solid for emphasis)
- Navigation: 20px icons
- Stat cards: 24px icons
- Buttons: 16px icons
- Tables: 16px icons

## Professional Polish

- Consistent border radius throughout (`rounded-lg` for cards, `rounded-md` for inputs)
- Subtle shadows for elevation (`shadow-sm` default, `shadow-lg` for modals)
- Smooth transitions on interactive elements
- Clear visual hierarchy with whitespace
- Loading skeletons for async content
- Empty states with helpful messaging and illustrations/icons
- Toast notifications for success/error feedback (top-right corner)