
 # Offer Catalogue Editor

 This is a web-based tool for exploring, editing, and extending offer catalogues stored in CSV files. It’s designed for business users who need to safely tweak offer data without touching raw spreadsheets, and for engineers who want a clear, opinionated workflow around CSV-based configuration.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Deploy for free

  The project is ready to deploy. Config files are included for **Vercel** and **Netlify**.

  **Option A – Vercel (recommended)**  
  1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).  
  2. Click **Add New** → **Project**.  
  3. Import your Git repo (or upload this folder).  
  4. Click **Deploy**. No extra settings needed.

  **Option B – Netlify**  
  1. Go to [netlify.com](https://netlify.com) and sign in.  
  2. **Add new site** → **Import an existing project** (or drag the `dist` folder after running `npm run build`).  
  3. If using Git: build command `npm run build`, publish directory `dist`.  
  4. Deploy.

 Build command: `npm run build` — Output: `dist/`  

 ---

 ## User Guide

 ### What You Can Do

 - Upload a CSV offer catalogue and inspect its contents.
 - Edit existing rows directly in a table-like editor.
 - Add new rows using a guided form that can auto-generate values.
 - Validate key business rules (e.g. `pyName`, `OfferName`, date logic) before saving.
 - Export the updated data as a CSV file for downstream systems.

 ### Supported CSV Format

 The app expects a header row followed by data rows.

 - **Required headers (if present in your data model):**
   - `pyName` – must be non-empty and unique across all rows.
   - `OfferName` – must be non-empty.
 - **Optional but specially treated columns:**
   - `pyIsPropositionActive`
   - `StartDate`
   - `EndDate`

 If these columns are present, the app enforces additional rules described below.

 ### Basic Workflow

 1. Open the deployed app in your browser.
 2. Upload a `.csv` file that contains your offer catalogue.
 3. Review and optionally edit existing rows in the CSV Data Editor.
 4. Add new rows using the Add New Row form.
 5. Export the updated CSV file when you are done.

 ### CSV Data Editor Page

 On the CSV Data Editor page you can:

 - View the current CSV in a scrollable table.
 - Enter **Edit Mode** to modify cell values inline.
 - Navigate to **Add New Row** for guided row creation.
 - **Export CSV** to download the current state of the data.

 **Edit Mode behavior**

 - When Edit Mode is active, every cell becomes an input field.
 - Changes are kept locally until you click **Save Changes**.
 - **Cancel** will discard unsaved edits and restore the last saved state.

 ### Add New Row Page

 The Add New Row page shows one section per column in your CSV. For each column you can choose one of four modes:

 - **Select Value** – choose from existing values found in that column.
 - **Custom Value** – type a brand new value.
 - **Empty** – explicitly leave the value empty.
 - **Auto** – let the system auto-generate a value based on patterns in existing rows.

 **Mandatory fields**

 - `pyName` must be filled and unique.
 - `OfferName` must be filled.

 If these rules are not met, you will see validation errors and the row will not be saved.

 ### Date Rules & Validation

 When the CSV contains `pyIsPropositionActive`, `StartDate`, and `EndDate`, extra date-related rules apply:

 - If **StartDate** is provided but **EndDate** is missing, saving is blocked with  
   “When StartDate is provided, EndDate must also be provided.”
 - If **EndDate** is provided but **StartDate** is missing, saving is blocked with  
   “When EndDate is provided, StartDate must also be provided.”
 - If `pyIsPropositionActive` is `"Always"`, both `StartDate` and `EndDate` must be empty.
 - If `pyIsPropositionActive` is `"Date"`, both `StartDate` and `EndDate` are required.
 - When both `StartDate` and `EndDate` are provided, `pyIsPropositionActive` is automatically set to `"Date"` when the row is saved, and an informational banner on the Add New Row page makes this behavior explicit to the user.

 ### Date Normalization

 The app attempts to normalize recognizable date formats (for example `MM/DD/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, `DD.MM.YYYY`) into the standard `YYYY-MM-DD` format.  
 If a value cannot be confidently parsed as a date, it is left unchanged so users can review and correct it manually.

 ### Exporting Updated CSV

 - Use the **Export CSV** button on the CSV Data Editor page.
 - The downloaded file contains all original headers, all edited rows, and any newly added rows.
 - Your original uploaded file is never modified on disk; only the exported file reflects your changes.

 ---

 ## Developer Guide

 ### Tech Stack

 - React (via Vite)
 - TypeScript
 - Tailwind CSS (via `@tailwindcss/vite`)
 - Custom UI components under `src/app/components/ui`
 - `react-router` for client-side routing
 - `sonner` for toast notifications
 - `lucide-react` for icons

 ### Key Files

 - `src/app/Home.tsx` – upload entry screen and navigation into the editor.
 - `src/app/routes.ts` – route definitions for `/`, `/csv-editor`, and `/add-row`.
 - `src/app/pages/CSVEditor.tsx` – main CSV Data Editor (table view, Edit Mode, export).
 - `src/app/pages/AddRowForm.tsx` – Add New Row form, field modes, and business validation.
 - `src/app/context/CSVContext.tsx` – shared state for CSV data and selected file name.
 - `src/app/components/ui/*` – UI primitives (button, card, table, alert, etc.).

 ### Running Locally

 - Install dependencies: `npm install`
 - Start dev server: `npm run dev`
 - Build for production: `npm run build` (outputs to `dist/`)

 ### Data Flow

 - CSV is uploaded on the Home page and then parsed/normalized in `CSVEditor.tsx`.
 - Parsed data is stored in `CSVContext` and shared between `CSVEditor` and `AddRowForm`.
 - `CSVEditor` manages in-place edits via an `editedData` copy of the rows.
 - `AddRowForm` builds a new row based on per-column modes and validation, then appends it to `csvData.rows`.

 ### Validation & Business Rules

 - `AddRowForm.tsx` contains validation logic for:
   - Required `pyName` (non-empty and unique when the column exists).
   - Required `OfferName` (non-empty when the column exists).
   - `pyIsPropositionActive` vs `StartDate`/`EndDate` consistency.
   - Mutual requirement between `StartDate` and `EndDate`.
 - Date normalization is applied in both `CSVEditor` (when parsing) and `AddRowForm` (when saving a new row).

 ### Deployment Notes

 - Vite build output is in `dist/`.
 - `vercel.json` is configured with `outputDirectory: "dist"` and a rewrite to `index.html` so client-side routes work correctly on Vercel.

 ### Extension Guidelines

 - Preserve existing business logic and validation semantics.
 - Avoid refactoring core components (`CSVEditor`, `AddRowForm`, `CSVContext`) unless strictly necessary.
 - When adding new rules or fields, keep validation messages clear and user-focused.
 - Follow existing UI patterns under `src/app/components/ui` for any new visual elements.
  