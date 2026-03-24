import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";

export default function OfferVariationsSelect() {
  const navigate = useNavigate();
  const {
    csvData,
    folderFiles,
    setCsvData,
    setSelectedFileName,
    setWorkflowStep,
    setSelectedOfferVariants,
    setCurrentOfferVariantIndex,
    setAddRowDefaults,
    multiCsvUpdates,
    lastAddedOfferPyName,
  } = useCSV();

  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // Extract unique pyName values from current OfferVariations CSV data
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
    setWorkflowStep("offer-variations");
    navigate("/add-row");
  };

  const handleContinue = async () => {
    if (localSelected.length === 0) {
      toast.error("Please select at least one Offer Variant or add a new one.");
      return;
    }

    if (!lastAddedOfferPyName) {
      toast.error("Offer mapping missing. Please return to the Offer step.");
      return;
    }

    const offerToVariationsFile = folderFiles.find(file => {
      const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedFileName.includes('offertooffervariations');
    });

    if (!offerToVariationsFile) {
      // If the file is not found, we can't create the rows.
      toast.error("OfferToOfferVariations CSV not found in folder.");
      return;
    }

    // Persist selection into context and prep loop
    setSelectedOfferVariants(localSelected);
    setCurrentOfferVariantIndex(0);
    setWorkflowStep("offerto-offervariations");

    const firstVariant = localSelected[0];
    const fileName = offerToVariationsFile.name;

    if (multiCsvUpdates[fileName]) {
      setCsvData(multiCsvUpdates[fileName]);
      setSelectedFileName(fileName);
    } else {
      const { parseCsvFile } = await import('../utils/csvParse');
      const parsed = await parseCsvFile(offerToVariationsFile);
      setCsvData(parsed);
      setSelectedFileName(fileName);
    }

    setAddRowDefaults({
      pyName: `${lastAddedOfferPyName}-${firstVariant}`,
      pyLabel: `${lastAddedOfferPyName}-${firstVariant}`,
      OfferName: lastAddedOfferPyName,
      OfferVariant: firstVariant
    });

    navigate("/add-row");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-2">Offer Variations</h1>
        <p className="text-muted-foreground bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
          Select one or more Offer Variants. If you don't find your desired variant, click 'Add New Offer Variant' below.
        </p>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Available Variants</p>
              {availableVariants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableVariants.map(variant => (
                    <Button
                      key={variant}
                      type="button"
                      variant={localSelected.includes(variant) ? "default" : "outline"}
                      onClick={() => toggle(variant)}
                      size="sm"
                    >
                      {variant}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No variants found in the OfferVariations file. Please add a new one.</p>
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
                ➕ Add New Offer Variant
              </Button>
            </div>

            <div className="flex gap-4 pt-6 mt-8 border-t">
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
