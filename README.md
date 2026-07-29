                    [TAB - Root Level]
                    parentId: null
                    ancestors: []
                         │
                    ┌────┴────┐
                    │         │
              [SECTION]   [SECTION]
              parentId: TAB_ID
              ancestors: [TAB_ID]
                    │
              ┌────┴────┐
              │         │
          [SUBSECTION]  [SUBSECTION]
          parentId: SECTION_ID
          ancestors: [TAB_ID, SECTION_ID]
                    │
              ┌────┴────┐
              │         │
             [PAGE]    [PAGE]
          parentId: SUBSECTION_ID
          ancestors: [TAB_ID, SECTION_ID, SUBSECTION_ID]



          ## Key Points of This Menu Architecture

### 1. **Materialized Path Pattern**
- Stores complete ancestor path in `ancestors` array
- Eliminates recursive queries for tree traversal
- One query fetches entire hierarchy

### 2. **Hybrid Approach**
```
parentId: "ID"        → Relational (for validation)
ancestors: ["IDs"]    → Denormalized (for performance)
```
- Best of both worlds
- Validation + Performance

### 3. **Single Query Performance**
- Build full tree with ONE database call
- No N+1 query problem
- O(1) breadcrumb generation

### 4. **Hierarchy Validation**
- Prevents invalid parent-child relationships
- TAB → SECTION → SUBSECTION → PAGE (strict flow)
- Type checking before creation

### 5. **Auto-Generated Slugs**
- Unique URL-friendly identifiers
- Duplicate detection built-in
- Auto-fallback with counter (e.g., `products-1`)

### 6. **Order Management**
- Custom ordering at each level
- Duplicate prevention under same parent
- Sorted tree output

### 7. **Efficient Breadcrumbs**
```javascript
// Get full path instantly
const breadcrumb = await Menu.find({ 
  _id: { $in: page.ancestors } 
});
// Products > Electronics > Laptops > MacBook Pro
```

### 8. **Fast Permission Checks**
```javascript
// Check access to all ancestors
const hasAccess = await checkPermissions(user, page.ancestors);
```

### 9. **Scalability**
- Works for deep hierarchies (100+ levels)
- No performance degradation with depth
- In-memory tree building

### 10. **Data Integrity**
- Unique title under same parent
- Unique slug globally
- Unique order under same parent
- Cascading validation

### 11. **Simple Updates**
- Update only affected node
- Ancestors auto-updated on parent change
- No need to update all descendants

### 12. **Read-Heavy Optimization**
- Optimized for read operations (menus are read frequently)
- Write operations slightly more expensive but acceptable
- Perfect for UI navigation menus

---

## Quick Summary

| Feature | Benefit |
|---------|---------|
| `ancestors` array | No recursive queries |
| `parentId` + `ancestors` | Validation + Performance |
| One query tree | Fast UI rendering |
| Auto slugs | SEO friendly URLs |
| Order field | Custom sorting |
| Type validation | Data integrity |
| In-memory build | No DB overhead |