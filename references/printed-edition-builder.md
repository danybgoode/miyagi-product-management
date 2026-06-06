-User Story 1: Admin Curation & Visual Layout Canvas
Context
To launch the initial editions of the printed marketplace magazine, the platform admin needs a lightweight interface to select high-quality marketplace listings, automatically convert them into stylistic print ads based on their database metadata, and arrange them on a visual canvas. Rather than relying on a complex, free-form design tool, the builder uses predefined modular layouts (e.g., 1/4 page, 1/2 page, full page blocks) inspired by classic classified layouts, allowing the admin to easily alter colors, swap backgrounds, and refine text to capture a modern retro aesthetic.
User story
As a marketplace administrator,
I want to select live listings and arrange them on a modular page canvas using preset retro layout blocks,
So that I can quickly design a visually striking, approachable print edition without manual typesetting.
Acceptance criteria
• The Listing Curation Drawer: The admin dashboard must feature a side-drawer or modal that lets the admin browse, filter, and select live marketplace shops or individual product listings to pull onto the current page layout.
• Automatic Primitive Mapping: Upon selecting a listing, the system must automatically populate an ad block layout using the listing's structural data: • Images: Main product photo (scaled for print box). • Typography primitives: Product Title, curated Description excerpt, and Price. • Digital Bridge: Automatic generation of a high-resolution QR code and a clean short product URL string and qr code.
• The Grid Canvas & Modular Blocks: The page builder must layout pages in standard fractions to ensure geometric alignment: • 1/1 Full Page: Single high-impact product feature or shop spotlight. • 1/2 Horizontal/Vertical: Dual-listing layouts. • 1/4 Box: Traditional grid block reminiscent of classic Segundamano classifieds.
• Approachable Style Tweaks: For each individual block, the admin must have non-deterministic, controls via a floating inspector panel to modify: • Background color (selecting from a curated, retro-themed hex palette). • Frame border styles (e.g., thick retro lines, dotted borders, double-stroke lines). • Text size and toggle visibility for specific fields (e.g., hide description to let the image pop).
Sources and references
• Aesthetic Reference: Classic 90s Mexican Segundamano classified papers, vintage Sears/Catalogs, modern print-revival magazines like Apartamento or The Gentlewoman.
• UI Design Pattern: Flexbox/Grid-based dashboard widgets or kanban-style stackable layouts that translate directly into strict CSS layouts.


-User Story 2: Automated Multi-Ad Grid with Manual Override
Context
When building a print volume with dozens of curated listings, laying out each page from scratch is an operational bottleneck. The system needs to automatically pack incoming listings into uniform 4-quarter or 8-eighth grid pages by default. However, to keep the magazine looking like a dynamic, modern publication rather than a rigid database dump, the admin needs the ability to break those automated grids—merging cells to create half-page spotlights or shifting items between pages on the fly.
Acceptance Criteria
1. Automated Grid Packing
• The Density Toggle: The page builder must allow the admin to select a default page density before importing a batch of listings: • Dense Mode (8-Grid): Automatically slices the page layout into an 8-block matrix (2 \times 4). • Standard Mode (4-Grid): Automatically slices the page layout into a 4-block matrix (2 \times 2).
• Sequential Batch Ingestion: When the admin selects a group of 24 listings, the system must instantly spin up 3 to 6 template pages and distribute the items sequentially into the grid coordinates.
• Auto-Sizing Primitives: In 8-grid mode, the layout template must automatically hide long descriptions and use a smaller font size to ensure the text and image fit safely within the micro-box without clipping or overflowing the page boundaries.
2. Manual Canvas Override & Layout Swapping
• Drag-and-Drop Reordering: The admin must be able to drag an ad block from Page 1 and drop it into an empty or occupied slot on Page 2, with the surrounding grid shifting or swapping places automatically to accommodate the movement.
• Cell Merging (The "Promoted Ad" Feature): The admin must be able to select two adjacent 1/8 blocks or 1/4 blocks and click a "Merge" action. The system will instantly re-render that space as a single, combined 1/2-page horizontal or vertical block, dynamically scaling up the product image to match the new canvas size.
• Blank-Space Canvas Injection: The builder must allow the admin to inject custom, non-product content blocks (like a full-page editorial cover, retro banner filler ads, or curated section headers) anywhere in the page sequence.

-User Story 3: Configurable Print-Ready PDF Export Engine
Context
Commercial offset and digital printers in Mexico operate on rigid, physical paper dimension rules and strict pre-press requirements (like color bleeds and minimum resolution). Once the layout canvas is built on the web layer, the admin needs an export pipeline that converts the HTML/CSS workspace into a pixel-perfect, high-resolution PDF matching Mexican commercial printing standards without losing vector text crispness or distorting layout dimensions.
User story
As a marketplace administrator,
I want to export my designed pages into a high-resolution, print-ready PDF file configured to standard Mexican commercial paper specifications,
So that I can deliver the file directly to the local printing press without needing manual pre-press adjustments.
Acceptance criteria
• Dimension Presets Selection: The builder's export config must allow the user to toggle between the two dominant commercial print standards for magazines and catalogs in Mexico: • Tamaño Carta: 21.59 \times 27.94 \text{ cm} (8.5" x 11"). • Media Carta: 13.97 \times 21.59 \text{ cm} (5.5" x 8.5") — highly recommended for a lean, handbook-style first edition.
• Bleed Lines & Trim Box Handling (Rebase): The export engine must automatically append a standard 3mm (0.3 \text{ cm}) print bleed area to the outer edges of the generated document to prevent white clipping artifacts during physical paper cutting.
• High-Resolution Rendering: The output file must compile all asset links, text layers, and QR codes at a strict print resolution of 300 DPI (dots per inch).
• Vector Text & Asset Swapping: To prevent blurry print outputs, the export pipeline must maintain text elements as crisp, embedded vector font paths rather than rasterizing them into flat images. Product images must be swapped at compile time from low-res web thumbnails to the highest resolution original uploads available in the database bucket.
Sources and references
• Industry Standard: ISO 12647-2 (Graphic technology process control for offset lithography).
• Mexican Print Market Standard: Technical specifications sheets from major regional printers like Offset Santiago, Imprenta Formas Inteligentes, or localized commercial digital houses.