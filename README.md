# Menu Architecture Documentation

## Overview
A hierarchical menu system using a hybrid approach combining relational (`parentId`) and denormalized (`ancestors`) data patterns for optimal performance and data integrity.

## Data Structure

```
TAB (Root)
  └── SECTION
        └── SUBSECTION
              └── PAGE
```

### Path Storage
- **`parentId`**: Direct parent reference (relational)
- **`ancestors`**: Complete path array `[TAB_ID, SECTION_ID, SUBSECTION_ID]` (denormalized)

## Key Features

### 🚀 Performance
- **Single Query**: Fetch entire hierarchy in one database call
- **No N+1 Problem**: Prevents recursive queries
- **O(1) Breadcrumbs**: Instant path retrieval
- **In-Memory Building**: No database overhead for tree construction

### 🛡️ Data Integrity
- **Strict Hierarchy**: `TAB → SECTION → SUBSECTION → PAGE` flow enforced
- **Unique Constraints**:
  - Unique title per parent
  - Global unique slugs
  - Unique order under same parent
- **Type Validation**: Prevents invalid parent-child relationships

### 🎨 Smart Features
- **Auto-Generated Slugs**: SEO-friendly URLs with duplicate handling (`products`, `products-1`)
- **Custom Ordering**: Sortable items at each level
- **Efficient Access Control**: Fast permission checks via ancestors array

## Benefits

| Feature | Advantage |
|---------|-----------|
| Hybrid Approach | Relational validation + denormalized performance |
| Ancestors Array | No recursive queries needed |
| Auto Slugs | SEO-friendly URLs |
| Type Validation | Data integrity guaranteed |
| Single Query | Fast UI rendering |

## Use Cases
- Navigation menus
- Category hierarchies
- Content organization
- Any tree-structured data requiring fast reads

---

**Read-Heavy Optimization**: Perfect for frequently accessed menu structures. Write operations are slightly more expensive but acceptable given the read performance gains.