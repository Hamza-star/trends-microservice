<!-- Menu Architecture Section -->
<style>
  .arch-container {
    max-width: 900px;
    margin: 0 auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
  }
  
  .arch-title {
    font-size: 28px;
    font-weight: 700;
    color: #2d3748;
    border-bottom: 3px solid #4299e1;
    padding-bottom: 10px;
    margin-bottom: 30px;
  }
  
  .arch-diagram {
    background: #f7fafc;
    border-radius: 12px;
    padding: 30px;
    margin: 20px 0;
    border-left: 4px solid #4299e1;
    overflow-x: auto;
  }
  
  .node {
    display: inline-block;
    background: white;
    border: 2px solid #4299e1;
    border-radius: 8px;
    padding: 12px 20px;
    margin: 5px;
    font-weight: 600;
    color: #2d3748;
    position: relative;
    min-width: 120px;
    text-align: center;
  }
  
  .node-tab { border-color: #48bb78; background: #f0fff4; }
  .node-section { border-color: #4299e1; background: #ebf8ff; }
  .node-subsection { border-color: #ed8936; background: #fffaf0; }
  .node-page { border-color: #9f7aea; background: #faf5ff; }
  
  .node-label {
    font-size: 11px;
    display: block;
    color: #718096;
    font-weight: 400;
    margin-top: 4px;
  }
  
  .arrow {
    display: inline-block;
    color: #a0aec0;
    font-size: 20px;
    margin: 0 5px;
    font-weight: 300;
  }
  
  .level-label {
    display: block;
    color: #718096;
    font-size: 13px;
    font-weight: 600;
    margin: 15px 0 8px 0;
    letter-spacing: 1px;
  }
  
  .level-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 0;
  }
  
  .badge {
    background: #4299e1;
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  
  .arch-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 25px 0;
  }
  
  .arch-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .arch-card h4 {
    color: #2d3748;
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .arch-card ul {
    margin: 0;
    padding-left: 20px;
    color: #4a5568;
    line-height: 1.8;
  }
  
  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin: 20px 0;
  }
  
  .benefit-item {
    background: #f7fafc;
    padding: 15px;
    border-radius: 8px;
    border-left: 3px solid #4299e1;
  }
  
  .benefit-item strong {
    color: #2d3748;
    display: block;
    margin-bottom: 5px;
  }
  
  .benefit-item span {
    color: #4a5568;
    font-size: 14px;
  }
  
  .code-block {
    background: #2d3748;
    color: #e2e8f0;
    padding: 15px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    overflow-x: auto;
    margin: 10px 0;
  }
  
  .code-block .comment { color: #68d391; }
  .code-block .key { color: #f6ad55; }
  .code-block .value { color: #63b3ed; }
  
  @media (max-width: 768px) {
    .arch-grid { grid-template-columns: 1fr; }
    .benefits-grid { grid-template-columns: 1fr; }
    .node { min-width: 80px; padding: 8px 12px; font-size: 13px; }
  }
</style>

<div class="arch-container">

<h3 class="arch-title">📊 Menu Architecture</h3>

<!-- Database Schema -->
<div class="arch-card" style="margin-bottom: 20px;">
  <h4>📦 Database Schema</h4>
  <div class="code-block">
    <span class="key">_id</span>: <span class="value">ObjectId</span><br>
    <span class="key">title</span>: <span class="value">string</span>        <span class="comment">// Display name</span><br>
    <span class="key">slug</span>: <span class="value">string</span>          <span class="comment">// Auto-generated unique URL</span><br>
    <span class="key">type</span>: <span class="value">'TAB' | 'SECTION' | 'SUBSECTION' | 'PAGE'</span><br>
    <span class="key">parentId</span>: <span class="value">ObjectId | null</span>  <span class="comment">// null = root level</span><br>
    <span class="key">ancestors</span>: <span class="value">ObjectId[]</span>     <span class="comment">// Full path: [TAB, SECTION, ...]</span><br>
    <span class="key">order</span>: <span class="value">number</span>           <span class="comment">// Custom ordering</span><br>
    <span class="key">isActive</span>: <span class="value">boolean</span>
  </div>
</div>

<!-- Hierarchy Diagram -->
<div class="arch-diagram">
  <h4 style="margin:0 0 20px 0; color:#2d3748;">🌳 Hierarchy Diagram</h4>
  
  <!-- Level 1: TAB -->
  <div class="level-label">▼ LEVEL 1 (ROOT)</div>
  <div class="level-row">
    <div class="node node-tab">
      Products <span class="node-label">TAB</span>
    </div>
    <div class="node node-tab">
      Services <span class="node-label">TAB</span>
    </div>
  </div>
  
  <div style="text-align:center; color:#a0aec0; font-size:24px; margin:5px 0;">│</div>
  
  <!-- Level 2: SECTION -->
  <div class="level-label">▼ LEVEL 2 (UNDER TAB)</div>
  <div class="level-row">
    <div class="node node-section">
      Electronics <span class="node-label">SECTION</span>
    </div>
    <div class="arrow">→</div>
    <div class="node node-section">
      Clothing <span class="node-label">SECTION</span>
    </div>
  </div>
  
  <div style="text-align:center; color:#a0aec0; font-size:24px; margin:5px 0;">│</div>
  
  <!-- Level 3: SUBSECTION -->
  <div class="level-label">▼ LEVEL 3 (UNDER SECTION)</div>
  <div class="level-row">
    <div class="node node-subsection">
      Laptops <span class="node-label">SUBSECTION</span>
    </div>
    <div class="arrow">→</div>
    <div class="node node-subsection">
      Mobiles <span class="node-label">SUBSECTION</span>
    </div>
  </div>
  
  <div style="text-align:center; color:#a0aec0; font-size:24px; margin:5px 0;">│</div>
  
  <!-- Level 4: PAGE -->
  <div class="level-label">▼ LEVEL 4 (UNDER SUBSECTION)</div>
  <div class="level-row">
    <div class="node node-page">
      MacBook Pro <span class="node-label">PAGE</span>
    </div>
    <div class="arrow">→</div>
    <div class="node node-page">
      Dell XPS <span class="node-label">PAGE</span>
    </div>
  </div>
  
  <div style="margin-top:20px; padding:15px; background:#edf2f7; border-radius:8px;">
    <div style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">
      <span><span class="badge" style="background:#48bb78;">TAB</span> Root Level</span>
      <span><span class="badge" style="background:#4299e1;">SECTION</span> Under TAB</span>
      <span><span class="badge" style="background:#ed8936;">SUBSECTION</span> Under SECTION</span>
      <span><span class="badge" style="background:#9f7aea;">PAGE</span> Under SUBSECTION</span>
    </div>
  </div>
</div>

<!-- How It Works -->
<div class="arch-grid">
  <div class="arch-card">
    <h4>🔗 How Ancestors Work</h4>
    <div style="font-size:14px; color:#4a5568; line-height:2;">
      <div><strong>TAB</strong> → <span style="color:#718096;">parentId: null</span>, <span style="color:#718096;">ancestors: []</span></div>
      <div><strong>SECTION</strong> → <span style="color:#718096;">parentId: TAB_ID</span>, <span style="color:#718096;">ancestors: [TAB_ID]</span></div>
      <div><strong>SUBSECTION</strong> → <span style="color:#718096;">parentId: SECTION_ID</span>, <span style="color:#718096;">ancestors: [TAB_ID, SECTION_ID]</span></div>
      <div><strong>PAGE</strong> → <span style="color:#718096;">parentId: SUBSECTION_ID</span>, <span style="color:#718096;">ancestors: [TAB_ID, SECTION_ID, SUBSECTION_ID]</span></div>
    </div>
  </div>
  
  <div class="arch-card">
    <h4>📋 Hierarchy Rules</h4>
    <ul>
      <li><strong>TAB</strong> → Only at <strong>root</strong> level</li>
      <li><strong>SECTION</strong> → Only under <strong>TAB</strong></li>
      <li><strong>SUBSECTION</strong> → Only under <strong>SECTION</strong></li>
      <li><strong>PAGE</strong> → Under <strong>TAB / SECTION / SUBSECTION</strong></li>
    </ul>
    <div style="margin-top:10px; background:#ebf8ff; padding:8px; border-radius:6px; font-size:13px; color:#2b6cb0;">
      ⚡ <strong>parentId</strong> validates hierarchy · <strong>ancestors</strong> enables fast queries
    </div>
  </div>
</div>

<!-- Benefits -->
<h4 style="margin:30px 0 15px 0; color:#2d3748;">✨ Key Benefits</h4>

<div class="benefits-grid">
  <div class="benefit-item">
    <strong>🚀 Single Query</strong>
    <span>Fetch entire tree with just ONE database call. No recursive queries needed.</span>
  </div>
  <div class="benefit-item">
    <strong>⚡ No N+1 Problem</strong>
    <span>Build complete hierarchy in memory using parentId and ancestors arrays.</span>
  </div>
  <div class="benefit-item">
    <strong>🔍 Fast Breadcrumbs</strong>
    <span>ancestors array gives full path instantly. Perfect for navigation.</span>
  </div>
  <div class="benefit-item">
    <strong>🛡️ Hierarchy Validation</strong>
    <span>Validate parent type before creation. Prevents invalid structures.</span>
  </div>
  <div class="benefit-item">
    <strong>📊 Custom Ordering</strong>
    <span>order field at each level with duplicate prevention.</span>
  </div>
  <div class="benefit-item">
    <strong>🔗 Auto-Generated Slugs</strong>
    <span>Unique slugs from titles with duplicate detection.</span>
  </div>
</div>

<!-- Performance Comparison -->
<div class="arch-card" style="margin:20px 0;">
  <h4>📈 Performance Comparison</h4>
  <table style="width:100%; border-collapse:collapse; font-size:14px;">
    <thead>
      <tr style="background:#f7fafc; border-bottom:2px solid #e2e8f0;">
        <th style="padding:10px; text-align:left;">Operation</th>
        <th style="padding:10px; text-align:center;">Without Ancestors</th>
        <th style="padding:10px; text-align:center;">With Ancestors ✅</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px;">Get Full Tree</td>
        <td style="padding:10px; text-align:center;">N+1 Queries</td>
        <td style="padding:10px; text-align:center; color:#48bb78; font-weight:600;">1 Query</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px;">Breadcrumb Generation</td>
        <td style="padding:10px; text-align:center;">N Queries</td>
        <td style="padding:10px; text-align:center; color:#48bb78; font-weight:600;">1 Query</td>
      </tr>
      <tr>
        <td style="padding:10px;">Children Lookup</td>
        <td style="padding:10px; text-align:center;">Multiple Queries</td>
        <td style="padding:10px; text-align:center; color:#48bb78; font-weight:600;">1 Query</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Example Response -->
<div class="arch-card">
  <h4>📝 Example API Response</h4>
  <div class="code-block">
{
  <span class="key">_id</span>: <span class="value">"6a69b2c65a8e3e85a8c10afd"</span>,
  <span class="key">title</span>: <span class="value">"Products"</span>,
  <span class="key">type</span>: <span class="value">"TAB"</span>,
  <span class="key">parentId</span>: <span class="value">null</span>,
  <span class="key">ancestors</span>: <span class="value">[]</span>,
  <span class="key">order</span>: <span class="value">1</span>,
  <span class="key">children</span>: [
    {
      <span class="key">title</span>: <span class="value">"Electronics"</span>,
      <span class="key">type</span>: <span class="value">"SECTION"</span>,
      <span class="key">parentId</span>: <span class="value">"6a69b2c65a8e3e85a8c10afd"</span>,
      <span class="key">ancestors</span>: <span class="value">["6a69b2c65a8e3e85a8c10afd"]</span>,
      <span class="key">children</span>: [
        {
          <span class="key">title</span>: <span class="value">"Laptops"</span>,
          <span class="key">type</span>: <span class="value">"SUBSECTION"</span>,
          <span class="key">ancestors</span>: <span class="value">["TAB_ID", "SECTION_ID"]</span>
        }
      ]
    }
  ]
}
  </div>
</div>

</div>