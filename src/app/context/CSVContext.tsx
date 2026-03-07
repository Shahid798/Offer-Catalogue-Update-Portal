import { createContext, useContext, useState, ReactNode } from 'react';

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface CSVContextType {
  csvData: CSVData | null;
  setCsvData: (data: CSVData | null) => void;
  selectedFileName: string | null;
  setSelectedFileName: (name: string | null) => void;
}

const CSVContext = createContext<CSVContextType | undefined>(undefined);

export function CSVProvider({ children }: { children: ReactNode }) {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  return (
    <CSVContext.Provider value={{ csvData, setCsvData, selectedFileName, setSelectedFileName }}>
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
