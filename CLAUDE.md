# CLAUDE.md - AI Assistant Context

This document provides context for AI assistants working on the MyCore project.

## Project Overview

MyCore is a comprehensive personal management system designed to centralize and organize personal investments, real estate holdings, contracts, and relationships. Built with modern web technologies, it emphasizes security, data integrity, and user experience.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI Components**: Radix UI with Radix Themes
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Authentication**: Supabase Auth with email whitelist
- **File Storage**: Supabase Storage with public buckets

### Key Design Decisions

1. **Sidebar Navigation**: Collapsible sidebar with icons for better UX
2. **Row Level Security**: All database tables use RLS for data isolation
3. **Centralized Person Management**: Single source of truth for people/organizations
4. **Modular Component Structure**: Separate components for each feature domain

## Database Schema

### Investment Tables
- `investments`: Core investment records (equity/stock types)
- `investment_owners`: Links to persons table for ownership tracking
- `investment_metrics`: Time-series data for performance metrics
- `stock_prices`: Historical stock price data
- `companies`: Companies within equity investments

### Real Estate Tables
- `properties`: Property records with ownership types
- `property_images`: Gallery images for properties
- `property_documents`: Legal documents, deeds, etc.
- `property_renewals`: Tracking renewal dates

### Contract Management
- `contracts`: Service contracts with renewal tracking
- `contract_documents`: Contract-related documents

### Person Management
- `persons`: Central table for individuals/organizations (with health fields)
- `person_documents`: Identity documents, tax docs
- `person_relationships`: Relationship mapping

### Health Tracking Tables
- `health_profiles`: Extended health information per person
- `health_metrics`: Time-series health measurements
- `medical_records`: Medical document metadata
- `health_goals`: Health goal tracking
- `health_reminders`: Health reminder scheduling
- `medical_procedures`: Surgery/procedure history
- `health_ai_settings`: AI configuration for health insights

### Utility Tables
- `whitelist`: Email whitelist for authentication
- Storage buckets: property-images, property-documents, person-documents, medical-records

## Code Standards

### Component Structure
```typescript
// Use functional components with TypeScript
interface ComponentProps {
  data: DataType;
  onAction: () => void;
}

export function Component({ data, onAction }: ComponentProps) {
  // Component logic
}
```

### File Organization
- Pages in `src/app/(dashboard)/dashboard/[feature]/page.tsx`
- Components in `src/components/[feature]/`
- Shared utilities in `src/lib/`

### State Management
- Local state with React hooks
- Server state with Supabase real-time subscriptions
- Form state managed within components

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages
- Console logging for debugging

## Common Patterns

### Data Fetching
```typescript
const fetchData = async () => {
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Modal Components
- Use Radix UI Dialog
- Separate create/edit modes
- Form validation before submission

### File Uploads
```typescript
// Upload to Supabase Storage
const { data: uploadData, error } = await supabase.storage
  .from('bucket-name')
  .upload(fileName, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('bucket-name')
  .getPublicUrl(fileName);
```

## Security Considerations

1. **Authentication**: Email whitelist enforced at signup
2. **Authorization**: RLS policies on all tables
3. **Data Access**: Users can only see their own data
4. **File Access**: Public buckets with UUID-based paths
5. **API Keys**: Service role key only used server-side

## Testing & Deployment

### Development
```bash
npm run dev              # Start dev server
npm run lint             # Check code quality
npm run whitelist:list   # Manage access
```

### Production Build
```bash
npm run build
npm run start
```

## Common Tasks

### Adding a New Feature Module
1. Create page in `src/app/(dashboard)/dashboard/[feature]/`
2. Create components in `src/components/[feature]/`
3. Add navigation item to sidebar
4. Create database tables with RLS
5. Add TypeScript interfaces

### Health Feature Integration Pattern
1. Health tracking is person-centric (enabled per person)
2. All health components receive `personId` prop
3. Use tabs for organizing health sections
4. Implement visual feedback (charts, progress bars)
5. Include data export/import capabilities

### Updating Database Schema
1. Create migration in Supabase dashboard
2. Update TypeScript interfaces
3. Update component queries
4. Test RLS policies

### Adding File Upload
1. Create storage bucket if needed
2. Implement upload handler
3. Store public URL in database
4. Add download/delete functionality

## Known Issues & Limitations

1. **Search**: Currently using client-side filtering
2. **Real-time**: Not implemented, uses manual refresh
3. **Mobile**: Sidebar needs responsive design improvements
4. **Batch Operations**: Not yet implemented
5. **Health Charts**: Requires `recharts` package installation

## Future Enhancements

1. Advanced search with full-text search
2. Real-time updates using Supabase subscriptions
3. Mobile-responsive sidebar
4. Bulk import/export functionality
5. Advanced analytics and reporting
6. API for external integrations

## Helpful Commands

```bash
# Development
npm run dev

# Database
npx supabase db diff
npx supabase db push

# Type Generation
npx supabase gen types typescript

# Whitelist Management
npm run whitelist:add "email@example.com" "Name"
npm run whitelist:remove "email@example.com"
npm run whitelist:list

# Storage Buckets Setup
npm run setup:buckets
```

## Important Notes

- Always check for existing data before creating new records
- Use proper TypeScript types for all components
- Follow the established UI patterns (Radix UI components)
- Maintain consistent error handling
- Test RLS policies when adding new features
- Keep the sidebar navigation updated when adding modules

## Health Tracking Specifics

### Data Model
- Health tracking is opt-in per person via `health_enabled` flag
- All health tables reference `person_id` for data isolation
- Metrics use JSONB for flexible value storage
- Medical records support file uploads

### UI Patterns
- Use SegmentedControl for metric type selection
- Implement charts for trend visualization (recharts)
- Show progress bars for goals
- Use badges for status indicators
- Include date range selectors for historical data

### Security Considerations
- Medical records stored in separate bucket
- AI API keys encrypted before storage
- All health data protected by RLS
- Explicit user consent for AI features