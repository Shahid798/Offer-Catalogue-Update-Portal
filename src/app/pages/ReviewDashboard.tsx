import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { unparseCsvText } from "../utils/csvParse";

export default function ReviewDashboard() {
  const navigate = useNavigate();
  const { 
    multiCsvUpdates, 
    addedRowsTracker,
    folderFiles,
    startNewOfferWorkflow,
    setCsvData,
    setSelectedFileName
  } = useCSV();

  const handleExport = async () => {
    try {
      const zip = new JSZip();
      
      const fileNames = Object.keys(multiCsvUpdates);
      if (fileNames.length === 0) {
        toast.error("No updated CSVs to export.");
        return;
      }

      for (const fileName of fileNames) {
        const data = multiCsvUpdates[fileName];
        const csvString = unparseCsvText(data);
        zip.file(fileName, csvString);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'Updated_Offer_Catalogue.zip');
      toast.success("Catalogue exported successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export catalogue.");
    }
  };

  const fileNames = Object.keys(multiCsvUpdates);

  const handleAddAnotherOffer = () => {
    startNewOfferWorkflow();
    
    // Resume workflow utilizing the internally updated Offer schema retaining prior iterations natively
    const offerFile = folderFiles.find(f => f.name.toLowerCase().includes('offer') && !f.name.toLowerCase().includes('offervariations'));
    const fileName = offerFile ? offerFile.name : Object.keys(multiCsvUpdates)[0];

    if (multiCsvUpdates[fileName]) {
      setCsvData(multiCsvUpdates[fileName]);
      setSelectedFileName(fileName);
    }
    navigate('/add-row');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-2">Review & Export Updated Offer Catalogue</h1>
        <p className="text-muted-foreground bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
          Review your configured CSV files below before generating the final exported dataset.
        </p>

        {fileNames.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No active configurations found. Start a workflow first.
          </Card>
        ) : (
          <div className="space-y-4">
            {fileNames.map(fileName => {
              const addedRows = addedRowsTracker[fileName] || [];
              return (
                <Card key={fileName} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{fileName}</h3>
                    <div className="text-sm text-slate-600 mt-2">
                       <p className="font-medium text-slate-700">Added rows ({addedRows.length}):</p>
                       {addedRows.length > 0 ? (
                         <ul className="list-disc pl-5 mt-1 space-y-1">
                           {addedRows.slice(0, 5).map((row, i) => (
                             <li key={i}>{row}</li>
                           ))}
                           {addedRows.length > 5 && (
                             <li className="text-slate-400 italic">...and {addedRows.length - 5} more</li>
                           )}
                         </ul>
                       ) : (
                         <p className="italic mt-1 text-slate-400">No new rows tracked.</p>
                       )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/review-editor/${encodeURIComponent(fileName)}`)}
                  >
                    🔍 Review Grid
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-8">
           <Button
             variant="secondary"
             size="lg"
             className="flex-1 transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-md cursor-pointer group"
             onClick={handleAddAnotherOffer}
           >
             <span className="group-hover:scale-110 transition-transform duration-200 inline-block mr-2">➕</span> 
             Add Another Offer
           </Button>
           <Button
             size="lg"
             className="flex-1 bg-green-600 hover:bg-green-700"
             onClick={handleExport}
             disabled={fileNames.length === 0}
           >
             ⬇️ Export Updated Offer Catalogue
           </Button>
         </div>
      </div>
    </div>
  );
}
