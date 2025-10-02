# VioConcierge UI Design System Documentation

**Version:** 1.0  
**Last Updated:** September 29, 2025  
**Purpose:** Comprehensive documentation of VioConcierge's UI design patterns, components, and principles for replication in other applications

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Sizing System](#spacing--sizing-system)
5. [Component Library](#component-library)
6. [Layout Patterns](#layout-patterns)
7. [Interactive States](#interactive-states)
8. [Accessibility](#accessibility)
9. [Responsive Design](#responsive-design)
10. [Implementation Guidelines](#implementation-guidelines)

---

## Design Philosophy

### Core Principles

**1. Clean & Professional**
- Minimalist aesthetic with generous white space
- Focus on content hierarchy and readability
- No unnecessary visual decoration
- Professional appearance suitable for B2B SaaS

**2. User-Centric**
- Intuitive navigation with clear information architecture
- Contextual actions close to related content
- Immediate feedback for user actions
- Accessible to all users regardless of technical expertise

**3. Consistent & Predictable**
- Uniform component behavior across the application
- Consistent spacing, sizing, and color usage
- Repeatable patterns that users learn quickly
- Single source of truth for design tokens

**4. Modern & Scalable**
- Contemporary design that feels current
- Component-based architecture for easy maintenance
- Token-based theming for brand customization
- Support for both light and dark modes

---

## Color System

### Design Token Architecture

VioConcierge uses a semantic color system based on HSL values, making colors easy to adjust while maintaining consistency. All colors are defined as CSS custom properties (variables) that map to specific UI purposes.

### Light Mode Color Palette

```css
/* Background & Surface Colors */
--background: hsl(210, 40%, 98%)        /* Soft blue-gray background */
--foreground: hsl(222.2, 84%, 4.9%)     /* Near-black text */
--card: hsl(0, 0%, 100%)                /* Pure white cards */
--card-foreground: hsl(222.2, 84%, 4.9%) /* Card text color */

/* Primary Brand Colors */
--primary: hsl(221.2, 83.2%, 53.3%)     /* Bright blue for CTAs */
--primary-foreground: hsl(210, 40%, 98%) /* Text on primary buttons */

/* Secondary & Accent Colors */
--secondary: hsl(210, 40%, 96%)         /* Subtle gray-blue */
--secondary-foreground: hsl(222.2, 84%, 4.9%)
--accent: hsl(210, 40%, 96%)            /* Hover states */
--accent-foreground: hsl(222.2, 84%, 4.9%)

/* Muted Colors (for less emphasis) */
--muted: hsl(210, 40%, 96%)             /* Disabled backgrounds */
--muted-foreground: hsl(215.4, 16.3%, 46.9%) /* Helper text, captions */

/* Semantic Colors */
--destructive: hsl(0, 84.2%, 60.2%)     /* Red for errors/delete */
--destructive-foreground: hsl(210, 40%, 98%)

/* Border & Input Colors */
--border: hsl(214.3, 31.8%, 91.4%)      /* Subtle borders */
--input: hsl(214.3, 31.8%, 91.4%)       /* Input field borders */
--ring: hsl(221.2, 83.2%, 53.3%)        /* Focus ring (matches primary) */
```

### Dark Mode Color Palette

```css
/* Dark mode inverts light/dark relationships */
--background: hsl(222.2, 84%, 4.9%)     /* Dark navy background */
--foreground: hsl(210, 40%, 98%)        /* Light text */
--card: hsl(222.2, 84%, 4.9%)           /* Dark cards */
--primary: hsl(210, 40%, 98%)           /* Inverted for contrast */
--secondary: hsl(217.2, 32.6%, 17.5%)   /* Darker gray */
--muted: hsl(217.2, 32.6%, 17.5%)
--muted-foreground: hsl(215, 20.2%, 65.1%)
--border: hsl(217.2, 32.6%, 17.5%)
```

### Sidebar-Specific Colors

The sidebar has its own color palette for visual distinction:

```css
/* Light Sidebar */
--sidebar: hsl(180, 6.67%, 97.06%)      /* Very light gray */
--sidebar-foreground: hsl(210, 25%, 7.84%)
--sidebar-primary: hsl(203.89, 88.28%, 53.14%) /* Bright blue */
--sidebar-primary-foreground: hsl(0, 0%, 100%)
--sidebar-accent: hsl(211.58, 51.35%, 92.75%) /* Light blue accent */
--sidebar-accent-foreground: hsl(203.89, 88.28%, 53.14%)
--sidebar-border: hsl(205, 25%, 90.59%)

/* Dark Sidebar */
--sidebar: hsl(228, 9.80%, 10%)         /* Very dark gray */
--sidebar-foreground: hsl(0, 0%, 85.10%)
--sidebar-accent: hsl(205.71, 70%, 7.84%)
```

### Chart Colors (Data Visualization)

Five distinct colors for charts and graphs:

```css
--chart-1: hsl(12, 76%, 61%)    /* Coral/Orange */
--chart-2: hsl(173, 58%, 39%)   /* Teal */
--chart-3: hsl(197, 37%, 24%)   /* Dark Blue */
--chart-4: hsl(43, 74%, 66%)    /* Yellow/Gold */
--chart-5: hsl(27, 87%, 67%)    /* Orange */
```

### Color Usage Guidelines

**Primary Blue** (`--primary`)
- Use for: Primary CTAs, active states, important links
- Examples: "Save" buttons, "Create Contact", active navigation items
- Sparingly used to draw attention to key actions

**Secondary Gray-Blue** (`--secondary`)
- Use for: Secondary actions, less important buttons
- Examples: "Cancel" buttons, "View Details", filter buttons

**Destructive Red** (`--destructive`)
- Use for: Delete actions, error messages, critical warnings
- Examples: "Delete Contact", error alerts, failed states

**Muted Gray** (`--muted`)
- Use for: Disabled states, placeholder text, helper text
- Examples: Form hints, timestamps, metadata

**Borders** (`--border`)
- Consistent border color throughout the application
- Subtle enough to organize without overwhelming
- Creates visual separation without heavy lines

### Color Accessibility

- All color combinations meet WCAG 2.1 AA contrast requirements (4.5:1 for text)
- Primary blue (#4F78E8) on white background: 4.52:1 contrast ratio ✓
- Foreground text on background: >15:1 contrast ratio ✓
- Never rely on color alone to convey information
- Use icons, labels, or patterns alongside color

---

## Typography

### Font Family

**Primary Font: Inter**
- Modern, professional sans-serif
- Excellent readability at all sizes
- Optimized for UI and screen display
- Loaded from Google Fonts with weights 300-700

```css
--font-sans: 'Inter', system-ui, sans-serif
--font-serif: Georgia, serif           /* Rarely used */
--font-mono: Menlo, monospace          /* Code/technical display */
```

### Type Scale

**Headers**
```css
/* Page Title */
.h1, h1 {
  font-size: 2rem;        /* 32px */
  font-weight: 700;       /* Bold */
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Section Title */
.h2, h2 {
  font-size: 1.5rem;      /* 24px */
  font-weight: 600;       /* Semibold */
  line-height: 1.3;
}

/* Card Title */
.h3, h3 {
  font-size: 1.25rem;     /* 20px */
  font-weight: 600;
  line-height: 1.4;
}

/* Subsection */
.h4, h4 {
  font-size: 1rem;        /* 16px */
  font-weight: 600;
  line-height: 1.5;
}
```

**Body Text**
```css
/* Default body */
body {
  font-size: 0.875rem;    /* 14px */
  font-weight: 400;       /* Regular */
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;  /* Smoother rendering */
}

/* Large body text */
.text-lg {
  font-size: 1rem;        /* 16px */
}

/* Small text (captions, helper text) */
.text-sm {
  font-size: 0.875rem;    /* 14px */
}

/* Tiny text (timestamps, metadata) */
.text-xs {
  font-size: 0.75rem;     /* 12px */
}
```

**Font Weights**
- `300` Light: Rarely used, only for large display text
- `400` Regular: Default body text, descriptions
- `500` Medium: Emphasis within body text
- `600` Semibold: Headings, important labels, active states
- `700` Bold: Page titles, primary headings, strong emphasis

### Typography Best Practices

1. **Hierarchy**: Use size, weight, and color to establish clear hierarchy
2. **Line Length**: Keep body text between 50-75 characters per line
3. **Line Height**: More generous for body text (1.5), tighter for headings (1.2)
4. **Letter Spacing**: Slightly negative for large text, normal for body
5. **Color**: Use `--foreground` for primary text, `--muted-foreground` for secondary

---

## Spacing & Sizing System

### Spacing Scale

VioConcierge uses a consistent 4px-based spacing system:

```css
--spacing: 0.25rem    /* Base unit: 4px */

/* Tailwind spacing classes used throughout */
/* Multiply base unit by the number */
```

| Class | Pixels | Usage |
|-------|--------|-------|
| `p-1` | 4px | Tight spacing (badges, small buttons) |
| `p-2` | 8px | Compact spacing (icon buttons) |
| `p-3` | 12px | Default small spacing |
| `p-4` | 16px | **Standard spacing** (most common) |
| `p-6` | 24px | **Card padding** (very common) |
| `p-8` | 32px | Section spacing |
| `p-12` | 48px | Large section spacing |
| `p-16` | 64px | Page-level spacing |

### Border Radius

Consistent rounded corners create a modern, friendly feel:

```css
--radius: 0.75rem     /* Base radius: 12px */

/* Applied values */
rounded-lg: 12px      /* Cards, dialogs, large elements */
rounded-md: 10px      /* calc(12px - 2px) - Medium elements */
rounded-sm: 8px       /* calc(12px - 4px) - Small elements */
rounded-full: 9999px  /* Circles (avatars, badges) */
```

**Usage:**
- **Cards**: `rounded-lg` (12px) for soft, modern appearance
- **Buttons**: `rounded-md` (10px) for friendly but professional
- **Inputs**: `rounded-md` (10px) to match buttons
- **Avatars**: `rounded-full` for perfect circles
- **Badges**: `rounded-full` for pill shape

### Element Sizing

**Buttons**
```css
/* Default button */
height: 40px (h-10)
padding: 8px 16px (py-2 px-4)

/* Small button */
height: 36px (h-9)
padding: 6px 12px (py-1.5 px-3)

/* Large button */
height: 44px (h-11)
padding: 10px 32px (py-2.5 px-8)

/* Icon button */
height: 40px (h-10)
width: 40px (w-10)
```

**Input Fields**
```css
/* Standard input */
height: 40px (h-10)
padding: 8px 12px (py-2 px-3)
border: 1px solid var(--input)
```

**Cards**
```css
padding: 24px (p-6)
border: 1px solid var(--border)
border-radius: 12px (rounded-lg)
background: var(--card)
```

### Grid System

**Dashboard Layouts**
```css
/* KPI Cards - 4 columns on desktop */
grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6

/* Content + Sidebar - 2 columns */
grid-cols-1 lg:grid-cols-3 gap-6
/* Main content: lg:col-span-2 */
/* Sidebar: lg:col-span-1 */

/* Form Layout - 2 columns */
grid-cols-1 md:grid-cols-2 gap-4
```

---

## Component Library

### 1. Buttons

**Primary Button**
```tsx
<Button variant="default">
  Create Contact
</Button>

/* Styles */
background: var(--primary)
color: var(--primary-foreground)
hover: opacity 90%
padding: 8px 16px
height: 40px
border-radius: 10px
font-weight: 500
```

**Secondary Button**
```tsx
<Button variant="secondary">
  Cancel
</Button>

/* Styles */
background: var(--secondary)
color: var(--secondary-foreground)
hover: opacity 80%
```

**Destructive Button**
```tsx
<Button variant="destructive">
  Delete Contact
</Button>

/* Styles */
background: var(--destructive)
color: var(--destructive-foreground)
```

**Outline Button**
```tsx
<Button variant="outline">
  View Details
</Button>

/* Styles */
background: transparent
border: 1px solid var(--input)
color: var(--foreground)
hover: background var(--accent)
```

**Ghost Button** (minimal, no background)
```tsx
<Button variant="ghost">
  <Icon />
</Button>

/* Styles */
background: transparent
border: none
hover: background var(--accent)
```

**Link Button** (text-only)
```tsx
<Button variant="link">
  Learn more
</Button>

/* Styles */
background: none
color: var(--primary)
text-decoration: underline on hover
```

### 2. Cards

**Standard Card Pattern**
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Label
        </p>
        <p className="text-2xl font-bold text-foreground">
          Value
        </p>
      </div>
      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
        <Icon />
      </div>
    </div>
  </CardContent>
</Card>
```

**Visual Characteristics:**
- White background (`var(--card)`)
- Subtle border (`1px solid var(--border)`)
- 12px border radius (`rounded-lg`)
- 24px padding (`p-6`)
- Subtle shadow (`shadow-sm`)
- Smooth hover transitions

**Card with Header**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
    <CardDescription>Your latest actions</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
  <CardFooter>
    {/* Footer actions */}
  </CardFooter>
</Card>
```

### 3. Forms

**Form Field Pattern**
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Field Label</FormLabel>
          <FormControl>
            <Input placeholder="Placeholder text" {...field} />
          </FormControl>
          <FormDescription>
            Helper text explaining this field
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

**Input Styling:**
```css
border: 1px solid var(--input)
background: var(--background)
padding: 8px 12px
height: 40px
border-radius: 10px
font-size: 14px

/* Focus state */
outline: none
border-color: var(--ring)
box-shadow: 0 0 0 2px var(--ring) with opacity
```

**Form Layout Best Practices:**
- Labels above inputs, left-aligned
- Required field indicators (asterisk or badge)
- Helper text below input in muted color
- Error messages in red (`--destructive`)
- Group related fields together
- 16px spacing between fields (`space-y-4`)

### 4. Modals (Dialogs)

**Dialog Pattern**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[525px]">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Brief description of dialog purpose
      </DialogDescription>
    </DialogHeader>
    
    {/* Dialog content here */}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button type="submit">
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Visual Characteristics:**
- Dark overlay (80% black opacity)
- White centered dialog (`var(--background)`)
- Max width 525px on mobile
- Smooth slide + fade animation
- Close button in top-right
- Footer actions right-aligned
- Escape key to close

### 5. Tables

**Table Structure**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon">
          <MoreVertical />
        </Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Table Styling:**
```css
/* Table */
border: 1px solid var(--border)
border-radius: 12px

/* Header */
background: var(--muted)
font-weight: 600
font-size: 12px
text-transform: uppercase
letter-spacing: 0.05em
color: var(--muted-foreground)

/* Rows */
border-bottom: 1px solid var(--border)
hover: background var(--muted)
transition: background 200ms

/* Cells */
padding: 12px 16px
font-size: 14px
```

### 6. Badges

**Status Badges**
```tsx
{/* Success */}
<Badge className="bg-green-100 text-green-800">
  Active
</Badge>

{/* Warning */}
<Badge className="bg-yellow-100 text-yellow-800">
  Pending
</Badge>

{/* Error */}
<Badge className="bg-red-100 text-red-800">
  Failed
</Badge>

{/* Info */}
<Badge className="bg-blue-100 text-blue-800">
  In Progress
</Badge>
```

**Badge Styling:**
```css
display: inline-flex
align-items: center
border-radius: 9999px (full)
padding: 2px 10px
font-size: 12px
font-weight: 600
```

### 7. Alerts & Toasts

**Alert Component**
```tsx
<Alert variant="default">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

{/* Destructive Alert */}
<Alert variant="destructive">
  <XCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

**Toast Notifications**
```tsx
toast({
  title: "Success",
  description: "Contact created successfully",
  variant: "default", // or "destructive"
})
```

**Visual Characteristics:**
- Slide in from top-right
- Auto-dismiss after 5 seconds
- Stack vertically if multiple
- Icon indicating type
- Close button

### 8. Navigation (Sidebar)

**Sidebar Structure**
```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      {/* Logo and brand */}
    </SidebarHeader>
    
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    
    <SidebarFooter>
      {/* User menu */}
    </SidebarFooter>
  </Sidebar>
</SidebarProvider>
```

**Sidebar States:**
- **Expanded**: 280px width, full labels visible
- **Collapsed**: 64px width, icon-only mode
- **Mobile**: Overlay drawer from left
- **Keyboard shortcut**: Cmd/Ctrl + B to toggle

**Active State Styling:**
```css
background: var(--sidebar-accent)
color: var(--sidebar-accent-foreground)
font-weight: 600
border-left: 3px solid var(--sidebar-primary)
```

### 9. Dropdown Menus

**Dropdown Menu Pattern**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">
      <MoreVertical />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      <span>Edit</span>
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      <span>Delete</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Visual Characteristics:**
- Smooth fade + slide animation
- White background with subtle shadow
- 8px padding
- Hover state on items
- Icons 16px, aligned left with 8px margin
- Keyboard navigation support

### 10. Loading States

**Skeleton Loader**
```tsx
<Card className="animate-pulse">
  <CardContent className="p-6">
    <div className="h-4 bg-muted rounded mb-2"></div>
    <div className="h-8 bg-muted rounded mb-4"></div>
    <div className="h-3 bg-muted rounded w-3/4"></div>
  </CardContent>
</Card>
```

**Spinner**
```tsx
<div className="flex items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

---

## Layout Patterns

### 1. Application Shell

**Overall Structure**
```tsx
<div className="flex h-screen bg-background">
  {/* Sidebar - Fixed left */}
  <Sidebar />
  
  {/* Main Content Area */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Header - Fixed top */}
    <Header />
    
    {/* Scrollable Content */}
    <main className="flex-1 overflow-auto bg-background">
      {/* Page content */}
    </main>
  </div>
</div>
```

**Key Features:**
- Full-height layout (`h-screen`)
- Sidebar fixed on left (collapsible)
- Header fixed at top
- Main content scrolls independently
- Consistent background color

### 2. Dashboard Layout

**KPI Cards Grid**
```tsx
<div className="p-6">
  {/* KPI Cards - 4 columns */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {/* Metric Card */}
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Metric Label
            </p>
            <p className="text-2xl font-bold text-foreground">
              1,234
            </p>
          </div>
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {/* Optional: Trend indicator */}
        <div className="flex items-center mt-4">
          <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-xs text-green-500 font-medium">+12%</span>
          <span className="text-xs text-muted-foreground ml-1">
            from last month
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
  
  {/* Main Content + Sidebar */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main content - 2/3 width */}
    <div className="lg:col-span-2">
      <Card>
        {/* Charts, tables, etc */}
      </Card>
    </div>
    
    {/* Sidebar - 1/3 width */}
    <div className="lg:col-span-1">
      <Card>
        {/* Activity feed, quick actions */}
      </Card>
    </div>
  </div>
</div>
```

### 3. Page Header Pattern

**Consistent Page Headers**
```tsx
<div className="border-b bg-background">
  <div className="flex h-16 items-center px-6">
    {/* Left: Title + Description */}
    <div className="flex-1">
      <h1 className="text-2xl font-bold text-foreground">
        Page Title
      </h1>
      <p className="text-sm text-muted-foreground">
        Brief page description
      </p>
    </div>
    
    {/* Right: Actions */}
    <div className="flex items-center space-x-2">
      <Button variant="outline">
        Secondary Action
      </Button>
      <Button>
        Primary Action
      </Button>
    </div>
  </div>
</div>
```

### 4. List/Table View Pattern

**Consistent List Pages**
```tsx
<div className="p-6">
  {/* Search + Filters */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center space-x-2 flex-1">
      <Input
        placeholder="Search..."
        className="max-w-sm"
      />
      <Button variant="outline">
        <Filter className="mr-2 h-4 w-4" />
        Filters
      </Button>
    </div>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Create New
    </Button>
  </div>
  
  {/* Data Table */}
  <Card>
    <Table>
      {/* Table content */}
    </Table>
  </Card>
  
  {/* Pagination */}
  <div className="flex items-center justify-between mt-4">
    <p className="text-sm text-muted-foreground">
      Showing 1-10 of 100 results
    </p>
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">Previous</Button>
      <Button variant="outline" size="sm">Next</Button>
    </div>
  </div>
</div>
```

### 5. Detail View Pattern

**Consistent Detail Pages**
```tsx
<div className="p-6">
  {/* Breadcrumb */}
  <Breadcrumb className="mb-4">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink href="/contacts">Contacts</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>John Smith</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
  
  {/* Header with actions */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-3xl font-bold">John Smith</h1>
      <p className="text-muted-foreground">Contact details</p>
    </div>
    <div className="flex space-x-2">
      <Button variant="outline">
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
  
  {/* Content Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main content */}
    <div className="lg:col-span-2 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Detail fields */}
        </CardContent>
      </Card>
    </div>
    
    {/* Sidebar */}
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Action buttons */}
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

---

## Interactive States

### Hover States

**Buttons**
```css
/* Primary button hover */
hover:bg-primary/90       /* 90% opacity */

/* Secondary button hover */
hover:bg-secondary/80     /* 80% opacity */

/* Ghost button hover */
hover:bg-accent           /* Subtle background appears */

/* Card hover */
hover:shadow-lg           /* Deeper shadow */
hover:scale-[1.02]        /* Slight scale up */
hover:border-primary/20   /* Border color change */
```

**Transition Timing**
```css
transition-colors         /* 150ms for color changes */
transition-all            /* 200ms for multiple properties */
duration-200             /* Explicit 200ms duration */
```

### Focus States

**Input Fields**
```css
focus:outline-none
focus:ring-2
focus:ring-ring           /* Blue ring matching primary */
focus:ring-offset-2
focus:border-ring
```

**Buttons**
```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### Active States

**Navigation Items**
```css
/* Active sidebar item */
background: var(--sidebar-accent)
color: var(--sidebar-accent-foreground)
font-weight: 600
border-left: 3px solid var(--sidebar-primary)
```

**Tabs**
```css
/* Active tab */
border-bottom: 2px solid var(--primary)
color: var(--foreground)
font-weight: 600
```

### Disabled States

**Buttons**
```css
disabled:pointer-events-none
disabled:opacity-50
```

**Inputs**
```css
disabled:cursor-not-allowed
disabled:opacity-50
disabled:bg-muted
```

### Loading States

**Button Loading**
```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

**Skeleton Screens**
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded"></div>
</div>
```

---

## Accessibility

### Semantic HTML

- Use proper heading hierarchy (`<h1>`, `<h2>`, etc.)
- Use `<button>` for actions, `<a>` for navigation
- Use `<label>` associated with form inputs
- Use `<nav>` for navigation sections
- Use `<main>` for primary content

### ARIA Attributes

**Buttons with Icons Only**
```tsx
<Button variant="ghost" size="icon" aria-label="Edit contact">
  <Edit className="h-4 w-4" />
</Button>
```

**Modals**
```tsx
<DialogContent aria-describedby="dialog-description">
  <DialogDescription id="dialog-description">
    This action cannot be undone.
  </DialogDescription>
</DialogContent>
```

**Live Regions**
```tsx
<div role="alert" aria-live="polite">
  {errorMessage}
</div>
```

### Keyboard Navigation

- All interactive elements accessible via Tab
- Enter/Space to activate buttons
- Escape to close modals/dropdowns
- Arrow keys for menu navigation
- Cmd/Ctrl + B to toggle sidebar

### Color Contrast

- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements have sufficient contrast
- Focus indicators clearly visible
- Don't rely on color alone to convey information

### Screen Reader Support

- Descriptive alt text for images
- `aria-label` for icon-only buttons
- `aria-describedby` for form field hints
- Skip navigation links
- Logical tab order

---

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
sm: 640px    /* Small tablets */
md: 768px    /* Tablets */
lg: 1024px   /* Small desktops */
xl: 1280px   /* Large desktops */
2xl: 1536px  /* Extra large screens */
```

### Mobile Patterns (< 768px)

**Navigation**
- Sidebar becomes drawer overlay
- Hamburger menu to trigger
- Full-screen when open

**Layout**
- Single column grids
- Cards stack vertically
- Reduced padding (p-4 instead of p-6)

**Typography**
- Slightly smaller heading sizes
- Maintain readability

**Touch Targets**
- Minimum 44x44px for all interactive elements
- Increased spacing between buttons

### Tablet Patterns (768px - 1023px)

**Layout**
- 2-column grids where appropriate
- Sidebar can collapse to icon-only
- Maintain desktop-like experience

### Desktop Patterns (1024px+)

**Layout**
- Multi-column grids (3-4 columns)
- Sidebar expanded by default
- Maximum content width for readability

**Hover States**
- Rich hover interactions
- Tooltips on hover
- Cursor changes

---

## Implementation Guidelines

### Technology Stack

**Core Framework**
- React 18+ with TypeScript
- Vite for build tooling

**Styling**
- Tailwind CSS for utility classes
- CSS custom properties for theming
- shadcn/ui component library

**Component Architecture**
- Radix UI primitives (unstyled, accessible)
- shadcn/ui patterns (styled wrappers)
- Custom components as needed

### Setting Up the Design System

**1. Install Dependencies**
```bash
npm install -D tailwindcss postcss autoprefixer
npm install @radix-ui/react-*  # Install needed primitives
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react  # Icon library
```

**2. Configure Tailwind**
```js
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        // ... other colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
}
```

**3. Global CSS**
```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Copy all CSS variables from VioConcierge */
  --background: hsl(210, 40%, 98%);
  --foreground: hsl(222.2, 84%, 4.9%);
  /* ... etc */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
```

**4. Utility Functions**
```ts
// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Component Implementation Pattern

**Example: Button Component**
```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Using shadcn/ui

The easiest way to implement this design system is to use shadcn/ui components:

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Add individual components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
# ... etc
```

Then customize the components by:
1. Copying the CSS variables from VioConcierge
2. Adjusting Tailwind config to match
3. Modifying component variants as needed

### Best Practices

**1. Use Design Tokens**
- Always use CSS variables, never hardcoded colors
- Maintain single source of truth
- Easy to theme and customize

**2. Component Composition**
- Build complex UIs from simple components
- Use compound components pattern
- Keep components small and focused

**3. Consistent Spacing**
- Use the 4px spacing scale
- Use Tailwind spacing utilities
- Maintain consistent padding/margins

**4. Accessibility First**
- Test with keyboard navigation
- Use semantic HTML
- Include ARIA labels where needed
- Test with screen readers

**5. Performance**
- Lazy load routes/components
- Optimize images
- Use skeleton screens
- Minimize re-renders

---

## Quick Reference

### Common Tailwind Patterns

```tsx
/* Card */
<div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">

/* Primary Button */
<button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 font-medium">

/* Input Field */
<input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />

/* Grid Layout */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

/* Flex Container */
<div className="flex items-center justify-between space-x-4">

/* Text Styles */
<h1 className="text-2xl font-bold text-foreground">
<p className="text-sm text-muted-foreground">
```

### Icon Usage

- Use `lucide-react` for consistent icon set
- Icons in buttons: 16px (h-4 w-4)
- Icons in sidebar: 20px (h-5 w-5)
- Large decorative icons: 24px (h-6 w-6)
- Always include margin between icon and text (mr-2)

### Color Semantics

- **Primary Blue**: Main actions, links, active states
- **Secondary Gray**: Alternative actions, less emphasis
- **Destructive Red**: Delete, errors, warnings
- **Success Green**: Confirmations, positive trends (custom: `text-green-500`)
- **Warning Yellow**: Alerts, pending states (custom: `text-yellow-500`)
- **Info Blue**: Information, hints (custom: `text-blue-500`)

---

## Summary

VioConcierge's UI design system is built on these core principles:

1. **Token-based theming** - CSS variables for easy customization
2. **Component composition** - Radix UI primitives + shadcn/ui patterns
3. **Tailwind utility-first** - Rapid development with consistent styling
4. **Accessibility built-in** - WCAG AA compliant, keyboard navigable
5. **Responsive by default** - Mobile-first approach
6. **Modern & professional** - Clean aesthetic suitable for enterprise

By following these patterns and using the provided components, you can create applications with the same clean, professional look and feel as VioConcierge.

---

**Version:** 1.0  
**Last Updated:** September 29, 2025