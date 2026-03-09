import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Edit, FileSpreadsheet, Save, X, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Input } from '../components/ui/input';
import { useCSV } from '../context/CSVContext';
import { toast } from 'sonner';

interface CSVData {
  headers: string[];
  rows: string[][];
}

// Utility function to detect and normalize dates to YYYY-MM-DD format
function normalizeDateString(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  const trimmed = value.trim();
  if (!trimmed) return value;

  // If the value includes a time component, ignore time and normalize using only the date portion.
  // Examples: "2026-03-07T10:15:00Z" -> "2026-03-07", "03/07/2026 10:15" -> "03/07/2026"
  const parseTarget = trimmed.split(/[T\s]/)[0] || trimmed;
  
  // Try to parse various date formats
  const datePatterns = [
    // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY or D-M-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD (already correct format)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];
  
  for (const pattern of datePatterns) {
    const match = parseTarget.match(pattern);
    if (match) {
      let year, month, day;
      
      // Check if it's already in YYYY-MM-DD format
      if (pattern.source.startsWith('^\\(\\\\d\\{4\\}')) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Assume MM/DD/YYYY format for slashes, DD-MM-YYYY for dashes/dots
        if (pattern.source.includes('\\/')) {
          // MM/DD/YYYY
          month = match[1].padStart(2, '0');
          day = match[2].padStart(2, '0');
          year = match[3];
        } else {
          // DD-MM-YYYY or DD.MM.YYYY
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
        }
      }
      
      // Validate the date
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  
  // Try parsing ISO date strings
  const date = new Date(parseTarget);
  if (!isNaN(date.getTime()) && (parseTarget.includes('-') || parseTarget.includes('/'))) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Only return if it looks like a valid date (year is reasonable)
    if (year >= 1900 && year <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return value;
}

// Apply date normalization to all rows
function normalizeDatesInRows(rows: string[][]): string[][] {
  return rows.map(row => 
    row.map(cell => normalizeDateString(cell))
  );
}

export default function CSVEditor() {
  const navigate = useNavigate();
  const { csvData, setCsvData, selectedFileName, setSelectedFileName } = useCSV();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<string[][]>([]);

  // Handler to clear context and go back to upload
  const handleBackToUpload = () => {
    setCsvData(null);
    setSelectedFileName('');
    navigate('/');
  };

  useEffect(() => {
    // Check if CSV data already exists in context
    if (csvData) {
      setIsLoading(false);
      setEditedData(csvData.rows.map(row => [...row])); // Deep copy
      return;
    }

    // Otherwise, try to load from navigation state (first time)
    const stateData = (window.history.state?.usr?.csvData) as CSVData | undefined;
    const fileName = (window.history.state?.usr?.fileName) as string | undefined;
    
    if (stateData) {
      // Apply date normalization to state data as well
      const normalizedStateData = {
        ...stateData,
        rows: normalizeDatesInRows(stateData.rows)
      };
      setCsvData(normalizedStateData);
      if (fileName) setSelectedFileName(fileName);
      setEditedData(normalizedStateData.rows.map(row => [...row])); // Deep copy
      setIsLoading(false);
    } else {
      const files = (window.history.state?.usr?.files) as File[] | undefined;
      if (files && files.length > 0) {
        // Find first CSV file
        const csvFile = files.find(file => 
          file.name.toLowerCase().endsWith('.csv')
        );
        
        if (csvFile) {
          setSelectedFileName(csvFile.name);
          parseCSV(csvFile);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  }, [csvData, setCsvData, setSelectedFileName]);

  // Update editedData when csvData changes
  useEffect(() => {
    if (csvData) {
      setEditedData(csvData.rows.map(row => [...row]));
    }
  }, [csvData]);

  const parseCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setIsLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim())
      );

      // Apply date normalization to all rows
      const normalizedRows = normalizeDatesInRows(rows);

      const data = { headers, rows: normalizedRows };
      setCsvData(data);
      setEditedData(normalizedRows.map(row => [...row])); // Deep copy
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setIsLoading(false);
    }
  };

  const handleAddNewRow = () => {
    // Navigate to add row form
    navigate('/add-row');
  };

  const handleEditMode = () => {
    setIsEditMode(true);
    // Reset edited data to current CSV data
    if (csvData) {
      setEditedData(csvData.rows.map(row => [...row]));
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset edited data to original
    if (csvData) {
      setEditedData(csvData.rows.map(row => [...row]));
    }
  };

  const handleSaveEdit = () => {
    if (!csvData) return;

    // Apply date normalization to edited data before saving
    const normalizedEditedData = normalizeDatesInRows(editedData);

    // Update CSV data with edited data
    const updatedData = {
      ...csvData,
      rows: normalizedEditedData
    };

    setCsvData(updatedData);
    setEditedData(normalizedEditedData);
    setIsEditMode(false);
    toast.success('Changes saved successfully!');
  };

  const handleCellChange = (rowIndex: number, cellIndex: number, value: string) => {
    const newData = [...editedData];
    newData[rowIndex][cellIndex] = value;
    setEditedData(newData);
  };

  const handleExportCSV = () => {
    if (!csvData) return;

    // Create CSV content
    const csvContent = [
      csvData.headers.join(','),
      ...csvData.rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', selectedFileName || 'exported_data.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-muted-foreground">Loading CSV data...</p>
      </div>
    );
  }

  if (!csvData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToUpload}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <Card className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="mb-2">No CSV File Found</h2>
            <p className="text-muted-foreground mb-6">
              Please upload a CSV file to continue.
            </p>
            <Button onClick={handleBackToUpload}>
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={handleBackToUpload}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Upload
            </Button>
            <h1 className="mb-2">CSV Data Editor</h1>
            {selectedFileName && (
              <p className="text-muted-foreground">
                File: {selectedFileName}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <Card className="p-6 mb-6">
          <h2 className="mb-4">What would you like to do?</h2>
          {isEditMode ? (
            <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-md">
              <div className="flex-1">
                <p className="font-medium text-primary">Edit Mode Active</p>
                <p className="text-sm text-muted-foreground">
                  Make changes to the data below and click Save when done
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleSaveEdit}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleAddNewRow}
                className="flex-1"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Row
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleEditMode}
                className="flex-1"
              >
                <Edit className="w-5 h-5 mr-2" />
                Edit Data
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleExportCSV}
                className="flex-1"
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </Button>
            </div>
          )}
        </Card>

        {/* CSV Data Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Current Data ({csvData.rows.length} rows)</h3>
            {isEditMode && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {csvData.headers.map((header, index) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="font-medium">
                        {rowIndex + 1}
                      </TableCell>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {isEditMode ? (
                            <Input
                              value={cell}
                              onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            cell
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}