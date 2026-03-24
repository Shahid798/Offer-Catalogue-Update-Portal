import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CSVData {
  headers: string[];
  rows: string[][];
}

type WorkflowMode = 'single' | 'folder';

type WorkflowStep =
  | 'offer'
  | 'offer-variations'
  | 'offerto-offervariations'
  | 'channels'
  | 'channel-offer'
  | 'treatment-variations'
  | 'treatment-combo-selection'
  | 'treatmentto-treatmentvariations';

interface AddRowDefaults {
  // header -> value (mode will be set to 'custom' by AddRowForm)
  [header: string]: string;
}

interface CSVContextType {
  csvData: CSVData | null;
  setCsvData: (data: CSVData | null) => void;
  selectedFileName: string | null;
  setSelectedFileName: (name: string | null) => void;
  // Folder-based workflow state (used to preserve session across navigation)
  workflowMode: WorkflowMode;
  setWorkflowMode: (mode: WorkflowMode) => void;
  folderFiles: File[];
  setFolderFiles: (files: File[]) => void;

  // Multi-file workflow state (folder workflow only)
  workflowStep: WorkflowStep;
  setWorkflowStep: (step: WorkflowStep) => void;
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  currentChannelIndex: number;
  setCurrentChannelIndex: (index: number) => void;
  lastAddedOfferPyName: string | null;
  setLastAddedOfferPyName: (value: string | null) => void;

  // Store per-file updates so switching between channel CSVs doesn't lose changes
  multiCsvUpdates: Record<string, CSVData>;
  setMultiCsvUpdates: (updates: Record<string, CSVData>) => void;

  // Optional defaults for AddRowForm when creating derived rows (channel-offer)
  addRowDefaults: AddRowDefaults;
  setAddRowDefaults: (defaults: AddRowDefaults) => void;

  // OfferVariations workflow state
  selectedOfferVariants: string[];
  setSelectedOfferVariants: (variants: string[]) => void;
  currentOfferVariantIndex: number;
  setCurrentOfferVariantIndex: (index: number) => void;

  // TreatmentVariations workflow state
  selectedTreatmentVariants: string[];
  setSelectedTreatmentVariants: (variants: string[]) => void;
  createdChannelOfferPyNames: string[];
  setCreatedChannelOfferPyNames: (names: string[] | ((prev: string[]) => string[])) => void;
  treatmentCombos: Array<{ treatmentName: string, treatmentVariant: string, offerVariant: string }>;
  setTreatmentCombos: (combos: Array<{ treatmentName: string, treatmentVariant: string, offerVariant: string }>) => void;
  currentTreatmentComboIndex: number;
  setCurrentTreatmentComboIndex: (index: number) => void;

  // Review workflow tracking
  addedRowsTracker: Record<string, string[]>;
  setAddedRowsTracker: (tracker: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;

  resetWorkflowContext: () => void;
  startNewOfferWorkflow: () => void;
  baseCsvUpdates: Record<string, CSVData>;
  baseAddedRowsTracker: Record<string, string[]>;
}

const CSVContext = createContext<CSVContextType | undefined>(undefined);

export function CSVProvider({ children }: { children: ReactNode }) {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('single');
  const [folderFiles, setFolderFiles] = useState<File[]>([]);

  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('offer');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [lastAddedOfferPyName, setLastAddedOfferPyName] = useState<string | null>(null);
  const [multiCsvUpdates, setMultiCsvUpdates] = useState<Record<string, CSVData>>({});
  const [addRowDefaults, setAddRowDefaults] = useState<AddRowDefaults>({});
  const [selectedOfferVariants, setSelectedOfferVariants] = useState<string[]>([]);
  const [currentOfferVariantIndex, setCurrentOfferVariantIndex] = useState(0);

  const [selectedTreatmentVariants, setSelectedTreatmentVariants] = useState<string[]>([]);
  const [createdChannelOfferPyNames, setCreatedChannelOfferPyNames] = useState<string[]>([]);
  const [treatmentCombos, setTreatmentCombos] = useState<Array<{ treatmentName: string, treatmentVariant: string, offerVariant: string }>>([]);
  const [currentTreatmentComboIndex, setCurrentTreatmentComboIndex] = useState(0);

  const [addedRowsTracker, setAddedRowsTracker] = useState<Record<string, string[]>>({});
  
  // Snapshots for Multi-Offer workflows
  const [baseCsvUpdates, setBaseCsvUpdates] = useState<Record<string, CSVData>>({});
  const [baseAddedRowsTracker, setBaseAddedRowsTracker] = useState<Record<string, string[]>>({});

  const startNewOfferWorkflow = () => {
    // Save snapshots natively mapping state references representing the exact grid configurations
    setBaseCsvUpdates(JSON.parse(JSON.stringify(multiCsvUpdates)));
    setBaseAddedRowsTracker(JSON.parse(JSON.stringify(addedRowsTracker)));
    
    // Clear out temp step metrics natively prepping AddRowForm UI elements.
    setWorkflowStep('offer');
    setAddRowDefaults({});
    setLastAddedOfferPyName(null);
    setSelectedOfferVariants([]);
    setCurrentOfferVariantIndex(0);
    setSelectedChannels([]);
    setCurrentChannelIndex(0);
    setCreatedChannelOfferPyNames([]);
    setSelectedTreatmentVariants([]);
    setTreatmentCombos([]);
    setCurrentTreatmentComboIndex(0);
  };

  const resetWorkflowContext = () => {
    setCsvData(null);
    setSelectedFileName(null);
    setWorkflowStep('offer');
    
    // Core Rollback mechanics:
    setMultiCsvUpdates(baseCsvUpdates);
    setAddedRowsTracker(baseAddedRowsTracker);

    setAddRowDefaults({});
    setLastAddedOfferPyName(null);
    setSelectedOfferVariants([]);
    setCurrentOfferVariantIndex(0);
    setSelectedChannels([]);
    setCurrentChannelIndex(0);
    setCreatedChannelOfferPyNames([]);
    setSelectedTreatmentVariants([]);
    setTreatmentCombos([]);
    setCurrentTreatmentComboIndex(0);
  };

  return (
    <CSVContext.Provider value={{ 
      csvData, 
      setCsvData, 
      selectedFileName, 
      setSelectedFileName, 
      workflowMode, 
      setWorkflowMode, 
      folderFiles, 
      setFolderFiles,
      workflowStep,
      setWorkflowStep,
      selectedChannels,
      setSelectedChannels,
      currentChannelIndex,
      setCurrentChannelIndex,
      lastAddedOfferPyName,
      setLastAddedOfferPyName,
      multiCsvUpdates,
      setMultiCsvUpdates,
      addRowDefaults,
      setAddRowDefaults,
      selectedOfferVariants,
      setSelectedOfferVariants,
      currentOfferVariantIndex,
      setCurrentOfferVariantIndex,
      selectedTreatmentVariants,
      setSelectedTreatmentVariants,
      createdChannelOfferPyNames,
      setCreatedChannelOfferPyNames,
      treatmentCombos,
      setTreatmentCombos,
      currentTreatmentComboIndex,
      setCurrentTreatmentComboIndex,
      addedRowsTracker,
      setAddedRowsTracker,
      resetWorkflowContext,
      startNewOfferWorkflow,
      baseCsvUpdates,
      baseAddedRowsTracker
    }}>
      {children}
    </CSVContext.Provider>
  );
}

export function useCSV() {
  const context = useContext(CSVContext);
  if (context === undefined) {
    throw new Error('useCSV must be used within a CSVProvider');
  }
  return context;
}
