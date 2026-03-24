import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";

export default function TreatmentCombinationsSelect() {
  const navigate = useNavigate();
  const { 
    folderFiles,
    setCsvData,
    setSelectedFileName,
    setWorkflowStep,
    treatmentCombos,
    setTreatmentCombos,
    setCurrentTreatmentComboIndex,
    setAddRowDefaults,
    multiCsvUpdates,
    lastAddedOfferPyName,
  } = useCSV();

  const isMandatory = (combo: any) => {
    return combo.treatmentVariant === 'TreatmentVariantDefault' && combo.offerVariant === 'OfferVariantDefault';
  };

  const initialSelected = treatmentCombos
    .filter(isMandatory)
    .map(combo => `${combo.treatmentName}-${combo.treatmentVariant}-${combo.offerVariant}`);
  
  const [selectedPyNames, setSelectedPyNames] = useState<string[]>(initialSelected);

  const handleToggle = (pyName: string, isComboMandatory: boolean) => {
    if (isComboMandatory) return; // Cannot toggle mandatory combinations

    setSelectedPyNames(prev => {
      if (prev.includes(pyName)) {
        return prev.filter(name => name !== pyName);
      }
      return [...prev, pyName];
    });
  };

  const handleContinue = async () => {
    if (selectedPyNames.length === 0) {
      toast.error("Please select at least one combination.");
      return;
    }

    const filteredCombos = treatmentCombos.filter(combo => {
      const pyName = `${combo.treatmentName}-${combo.treatmentVariant}-${combo.offerVariant}`;
      return selectedPyNames.includes(pyName);
    });

    setTreatmentCombos(filteredCombos);

    const t2tFile = folderFiles.find(file => {
      const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedFileName.includes('treatmenttotreatmentvariations');
    });

    if (!t2tFile) {
      toast.error("TreatmentToTreatmentVariations CSV not found in folder.");
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

    const firstCombo = filteredCombos[0];
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
        <h1 className="mb-2">System - TreatmentToTreatmentVariations</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-blue-800 font-medium">Select Rows to be Created</p>
          <p className="text-sm text-blue-700 mt-2">
            Select which combinations you want to create. Default OfferVariant and Default TreatmentVariant combination is mandatory and pre-selected.
          </p>
        </div>

        <Card className="p-6">
           <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
             {treatmentCombos.map((combo, idx) => {
               const pyName = `${combo.treatmentName}-${combo.treatmentVariant}-${combo.offerVariant}`;
               const comboIsMandatory = isMandatory(combo);
               const isChecked = selectedPyNames.includes(pyName);

               return (
                 <div key={idx} className={`flex items-start space-x-3 p-3 rounded-md border ${comboIsMandatory ? 'bg-slate-50 border-slate-200' : 'bg-white hover:border-primary/50'}`}>
                   <Checkbox 
                     id={pyName} 
                     checked={isChecked} 
                     disabled={comboIsMandatory}
                     onCheckedChange={() => handleToggle(pyName, comboIsMandatory)}
                     className="mt-1"
                   />
                   <div className="flex-1 space-y-1">
                     <Label htmlFor={pyName} className={`font-medium ${comboIsMandatory ? 'text-slate-500' : 'cursor-pointer'}`}>
                       {pyName}
                     </Label>
                     <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                       <span className="bg-slate-100 px-2 py-0.5 rounded">Treatment: {combo.treatmentName}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded">OfferVariant: {combo.offerVariant}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded">TreatmentVariant: {combo.treatmentVariant}</span>
                     </div>
                   </div>
                   {comboIsMandatory && (
                     <span className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded">Mandatory</span>
                   )}
                 </div>
               );
             })}
           </div>

           <div className="pt-6 mt-8 border-t">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={selectedPyNames.length === 0}
              >
                Continue ({selectedPyNames.length} selected)
              </Button>
            </div>
        </Card>
      </div>
    </div>
  );
}
