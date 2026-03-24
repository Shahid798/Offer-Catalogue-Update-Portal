import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";

// Minimal date normalization helper that ignores time, aligned with existing logic.
function normalizeDateString(value: string): string {
  if (!value || typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  // Ignore any time component; use only the date part.
  const parseTarget = trimmed.split(/[T\s]/)[0] || trimmed;

  const datePatterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
  ];

  for (const pattern of datePatterns) {
    const match = parseTarget.match(pattern);
    if (match) {
      let year: string;
      let month: string;
      let day: string;

      if (pattern === datePatterns[2]) {
        // Already in YYYY-MM-DD
        year = match[1];
        month = match[2].padStart(2, "0");
        day = match[3].padStart(2, "0");
      } else if (pattern === datePatterns[0]) {
        // MM/DD/YYYY
        month = match[1].padStart(2, "0");
        day = match[2].padStart(2, "0");
        year = match[3];
      } else {
        // DD-MM-YYYY or DD.MM.YYYY
        day = match[1].padStart(2, "0");
        month = match[2].padStart(2, "0");
        year = match[3];
      }

      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  const date = new Date(parseTarget);
  if (!isNaN(date.getTime()) && (parseTarget.includes("-") || parseTarget.includes("/"))) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    if (year >= 1900 && year <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  return value;
}

function normalizeRows(rows: string[][]): string[][] {
  return rows.map(row => row.map(cell => normalizeDateString(cell)));
}

export default function OfferWorkflow() {
  const [showInstructions, setShowInstructions] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    setCsvData,
    setSelectedFileName,
    setWorkflowMode,
    folderFiles,
    setFolderFiles,
    startNewOfferWorkflow
  } = useCSV();

  // Prefer navigation state; fall back to context to preserve session on repeated actions.
  const stateFiles = (location.state as { files?: File[] } | undefined)?.files || [];
  const files = stateFiles.length > 0 ? stateFiles : folderFiles;

  // Persist folder workflow session state for subsequent navigations.
  if (files.length > 0) {
    setWorkflowMode("folder");
    if (folderFiles.length === 0) {
      setFolderFiles(files);
    }
  }

  // Choose an "Offer" CSV from the folder, preferring filenames that contain "offer".
  const offerFile = useMemo(() => {
    const csvFiles = files.filter(file =>
      file.name.toLowerCase().endsWith(".csv")
    );

    const byName = csvFiles.find(file =>
      file.name.toLowerCase().includes("offer")
    );

    return byName || csvFiles[0];
  }, [files]);

  const handleUpdateOffer = () => {
    // Strict separation: multi-file workflow should not enter CSV editor flow.
    toast.error("Update Offer via folder upload is not available yet. Please use Add New Offer.");
  };

  const handleAddNewOffer = async () => {
    if (!offerFile) {
      // No CSV to work with; fall back to current editor behavior.
      return;
    }

    // Save contextual state map baselines protecting against cancellations mid-loop
    startNewOfferWorkflow();

    const text = await offerFile.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length === 0) {
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines
      .slice(1)
      .map(line => line.split(",").map(cell => cell.trim()));

    const normalizedRows = normalizeRows(rows);

    // Load Offer CSV into the existing context so AddRowForm behaves as today.
    setCsvData({ headers, rows: normalizedRows });
    setSelectedFileName(offerFile.name);
    setWorkflowMode("folder");
    setFolderFiles(files);

    // Reuse the existing Add New Row page as the Offer step.
    navigate("/add-row");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="mb-2">Offer Workflow</h1>
          <p className="text-muted-foreground">
            Multiple CSV files were uploaded. Choose how you want to work with the Offer data.
          </p>

        </div>

        <Card className="p-6 space-y-4">
          <h2 className="mb-2">Actions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Button size="lg" variant="outline" onClick={handleUpdateOffer}>
              Update Offer
            </Button>
            <Button size="lg" variant="outline" onClick={handleAddNewOffer}>
              Add New Offer
            </Button>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md">
            <strong>Note:</strong> Please go through the workflow instructions before proceeding. This will help you understand each step and avoid losing progress.
          </div>
        </Card>

        <Card className="p-6">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <h2 className="text-lg font-semibold m-0 flex-1">Add Offer Workflow Instructions</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {showInstructions ? (
                <>Hide Instructions <ChevronUp className="w-4 h-4 ml-2" /></>
              ) : (
                <>Show Instructions <ChevronDown className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>

          {showInstructions && (
            <div className="pt-4 mt-2 border-t space-y-4 text-slate-700 text-sm">
              <p>
                This workflow helps you create and configure offers across multiple files including Offer Variations, Channels, and Treatments. Just review auto added fields and confirm.
              </p>
              <div>
                <p className="font-medium mb-1">Steps include:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Adding New Offer</li>
                  <li>Selecting or creating Offer Variants</li>
                  <li>Mapping Offer to Offer Variations</li>
                  <li>Configuring Channels (Treatments)</li>
                  <li>Defining Treatment Variants</li>
                  <li>Mapping Treatment to Treatment Variations</li>
                  <li>Reviewing and exporting final data</li>
                </ul>
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>OfferVariations and TreatmentVariations are not mandatory to upload. In case not provided, the system will create default ones.</li>
                  <li>Most of the fields will be auto populated after Offer details</li>
                  <li>For Availibility try setting pyIsPropositionActive as "Always" it will automatically disable Start and End date fields</li>
                  <li>On the contrary If you select Start/End date pyIsPropositionActive gets auto set to "Date"</li>
                  <li>After Offers Decision data most of the details will be auto filled although user review is recommended</li>
                  <li>Try to avoid Refresh or backward navigation as it will lead to loss of progress.</li>
                  <li>The system allows adding one offer at one iteration</li>
                  <li>Adding another offer is allowed when you reach the Review and Export Dashboard for first Offer. </li>
                </ul>
              </div>
              <p>You can review and edit all changes at the end before exporting.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

