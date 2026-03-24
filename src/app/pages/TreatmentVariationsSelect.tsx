import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";

export default function TreatmentVariationsSelect() {
  const navigate = useNavigate();
  const { 
    csvData,
    folderFiles,
    setCsvData,
    setSelectedFileName,
    setWorkflowStep,
    setSelectedTreatmentVariants,
    setTreatmentCombos,
    setCurrentTreatmentComboIndex,
    setAddRowDefaults,
    multiCsvUpdates,
    lastAddedOfferPyName,
    createdChannelOfferPyNames,
    selectedOfferVariants,
  } = useCSV();

  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // Extract unique pyName values from current TreatmentVariations CSV data
  const availableVariants = useMemo(() => {
    if (!csvData) return [];
    const pyNameIndex = csvData.headers.findIndex(h => h === 'pyName');
    if (pyNameIndex === -1) return [];
    
    const variants = csvData.rows
      .map(row => row[pyNameIndex])
      .filter(val => val && val.trim() !== '');
      
    return Array.from(new Set(variants));
  }, [csvData]);

  const toggle = (variant: string) => {
    setLocalSelected(prev => {
      if (prev.includes(variant)) {
        return prev.filter(v => v !== variant);
      }
      return [...prev, variant];
    });
  };

  const handleAddNewVariant = () => {
    setWorkflowStep("treatment-variations");
    navigate("/add-row");
  };

  const handleContinue = async () => {
    if (localSelected.length === 0) {
      toast.error("Please select at least one Treatment Variant or add a new one.");
      return;
    }

    if (createdChannelOfferPyNames.length === 0) {
      toast.error("No channels configured (missing TreatmentName). Please try again.");
      return;
    }

    const t2tFile = folderFiles.find(file => {
      const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedFileName.includes('treatmenttotreatmentvariations');
    });

    if (!t2tFile) {
      toast.error("TreatmentToTreatmentVariations CSV not found in folder.");
      return;
    }

    // Persist selection into context and prep loop
    setSelectedTreatmentVariants(localSelected);

    // Generate Cartesian product
    const combos = [];
    for (const ch of createdChannelOfferPyNames) {
       for (const tv of localSelected) {
          for (const ov of (selectedOfferVariants.length > 0 ? selectedOfferVariants : ["OfferVariantDefault"])) {
             combos.push({ treatmentName: ch, treatmentVariant: tv, offerVariant: ov });
          }
       }
    }
    
    setTreatmentCombos(combos);
    if (combos.length === 0) {
       toast.error("No valid combinations for TreatmentToTreatmentVariations.");
       return;
    }

    if (localSelected.length > 1) {
       setWorkflowStep("treatment-combo-selection");
       navigate("/treatment-combinations");
       return;
    }

    setCurrentTreatmentComboIndex(0);
    setWorkflowStep("treatmentto-treatmentvariations");

    const fileName = t2tFile.name;

    if (multiCsvUpdates[fileName]) {
      setCsvData(multiCsvUpdates[fileName]);
      setSelectedFileName(fileName);
    } else {
      const { parseCsvFile } = await import('../utils/csvParse');
      const parsed = await parseCsvFile(t2tFile);
      setCsvData(parsed);
      setSelectedFileName(fileName);
    }

    const firstCombo = combos[0];
    setAddRowDefaults({
      pyName: `${firstCombo.treatmentName}-${firstCombo.treatmentVariant}-${firstCombo.offerVariant}`,
      pyLabel: `${firstCombo.treatmentName}-${firstCombo.treatmentVariant}-${firstCombo.offerVariant}`,
      OfferName: lastAddedOfferPyName || '',
      OfferVariant: firstCombo.offerVariant,
      TreatmentName: firstCombo.treatmentName,
      TreatmentVariant: firstCombo.treatmentVariant
    });

    navigate("/add-row");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-2">Treatment Variations</h1>
        <p className="text-muted-foreground bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
          Select one or more Treatment Variants. If you don't find your desired variant, click 'Add New Treatment Variant' below.
        </p>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Available Variants from CSV</p>
              {availableVariants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableVariants.map(variant => (
                    <Button
                      key={variant as string}
                      type="button"
                      variant={localSelected.includes(variant as string) ? "default" : "outline"}
                      onClick={() => toggle(variant as string)}
                      size="sm"
                    >
                      {variant as string}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No variants found in the TreatmentVariations file. Please add a new one.</p>
              )}
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-sm font-medium">Don't see what you need?</h3>
              <Button 
                variant="secondary" 
                onClick={handleAddNewVariant}
                disabled={localSelected.length > 0}
                className="w-full sm:w-auto border border-slate-300 shadow-sm"
              >
                ➕ Add New Treatment Variant
              </Button>
            </div>

            <div className="pt-6 mt-8 border-t">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={localSelected.length === 0}
              >
                Continue ({localSelected.length} selected)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
