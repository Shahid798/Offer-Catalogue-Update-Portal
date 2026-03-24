import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useCSV } from '../context/CSVContext';
import { toast } from 'sonner';
import { getCsvDisplayName } from '../utils/csvName';
import { parseCsvFile } from '../utils/csvParse';

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface FieldValue {
  mode: 'existing' | 'custom' | 'empty' | 'auto';
  value: string;
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

export default function AddRowForm() {
  const navigate = useNavigate();
  const {
    csvData,
    setCsvData,
    selectedFileName,
    setSelectedFileName,
    workflowMode,
    folderFiles,
    workflowStep,
    setWorkflowStep,
    selectedChannels,
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
    setAddedRowsTracker
  } = useCSV();
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (csvData) {
      // Initialize field values with smart defaults
      const initialValues: Record<string, FieldValue> = {};
      csvData.headers.forEach((header, columnIndex) => {
        // Folder workflow derived rows (channel-offer) can provide fixed defaults.
        if (workflowMode === 'folder' && addRowDefaults && Object.prototype.hasOwnProperty.call(addRowDefaults, header)) {
          initialValues[header] = { mode: 'custom', value: addRowDefaults[header] };
          return;
        }

        // Check if column has same constant value for all rows
        const hasConstantValue = isColumnConstant(columnIndex);

        initialValues[header] = {
          mode: hasConstantValue ? 'auto' : 'empty',
          value: ''
        };
      });
      setFieldValues(initialValues);
    }
  }, [csvData, workflowMode, addRowDefaults]);

  // Validate and update errors whenever field values change
  useEffect(() => {
    validateForm();
  }, [fieldValues]);

  const validateForm = () => {
    if (!csvData) return;

    const errors: string[] = [];

    // Get current values for validation
    const currentValues: Record<string, string> = {};
    csvData.headers.forEach((header, columnIndex) => {
      const field = fieldValues[header];
      let value = '';
      if (field?.mode === 'auto') {
        value = generateAutoValue(columnIndex);
      } else if (field?.mode === 'existing' || field?.mode === 'custom') {
        value = field.value;
      }
      currentValues[header] = value;
    });

    // Check mandatory fields: pyName
    const pyNameIndex = csvData.headers.findIndex(h => h === 'pyName');
    if (pyNameIndex !== -1) {
      const pyNameValue = currentValues['pyName'];
      if (!pyNameValue || pyNameValue.trim() === '') {
        errors.push('pyName is required and cannot be empty.');
      } else {
        // Check pyName uniqueness only if it has a value
        const isDuplicate = csvData.rows.some(row => row[pyNameIndex] === pyNameValue);
        if (isDuplicate) {
          errors.push('pyName must be unique. This value already exists in the data.');
        }
      }
    }

    // Check mandatory fields: OfferName
    const offerNameIndex = csvData.headers.findIndex(h => h === 'OfferName');
    if (offerNameIndex !== -1) {
      const offerNameValue = currentValues['OfferName'];
      if (!offerNameValue || offerNameValue.trim() === '') {
        errors.push('OfferName is required and cannot be empty.');
      }
    }

    // Check pyIsPropositionActive validation
    const pyIsPropositionActiveIndex = csvData.headers.findIndex(h => h === 'pyIsPropositionActive');
    const startDateIndex = csvData.headers.findIndex(h => h === 'StartDate');
    const endDateIndex = csvData.headers.findIndex(h => h === 'EndDate');

    if (pyIsPropositionActiveIndex !== -1) {
      const pyIsPropositionActiveValue = currentValues['pyIsPropositionActive'];
      const startDateValue = currentValues['StartDate'] || '';
      const endDateValue = currentValues['EndDate'] || '';

      if (pyIsPropositionActiveValue === 'Always') {
        if (startDateValue.trim() !== '' || endDateValue.trim() !== '') {
          errors.push('When pyIsPropositionActive is "Always", StartDate and EndDate must be empty.');
        }
      } else if (pyIsPropositionActiveValue === 'Date') {
        if (!startDateValue || startDateValue.trim() === '') {
          errors.push('When pyIsPropositionActive is "Date", StartDate is required.');
        }
        if (!endDateValue || endDateValue.trim() === '') {
          errors.push('When pyIsPropositionActive is "Date", EndDate is required.');
        }
      }
    }

    // StartDate/EndDate mutual requirement: both must be provided together (before saving).
    if (startDateIndex !== -1 && endDateIndex !== -1) {
      const startDateValue = currentValues['StartDate'] || '';
      const endDateValue = currentValues['EndDate'] || '';
      const hasStart = startDateValue.trim() !== '';
      const hasEnd = endDateValue.trim() !== '';
      if (hasStart && !hasEnd) {
        errors.push('When StartDate is provided, EndDate must also be provided.');
      }
      if (hasEnd && !hasStart) {
        errors.push('When EndDate is provided, StartDate must also be provided.');
      }
    }

    setValidationErrors(errors);
  };

  const isColumnAlwaysPopulated = (columnIndex: number): boolean => {
    if (!csvData) return false;

    // Check if all rows have a non-empty value in this column
    return csvData.rows.every(row => {
      const value = row[columnIndex];
      return value && value.trim() !== '';
    });
  };

  const isColumnConstant = (columnIndex: number): boolean => {
    if (!csvData || csvData.rows.length === 0) return false;

    // Check if all rows have the same value in this column
    const firstValue = csvData.rows[0][columnIndex];
    if (!firstValue || firstValue.trim() === '') return false;

    return csvData.rows.every(row => row[columnIndex] === firstValue);
  };

  const getUniqueValuesForColumn = (columnIndex: number): string[] => {
    if (!csvData) return [];
    const values = csvData.rows
      .map(row => row[columnIndex])
      .filter(val => val && val.trim() !== '');
    return Array.from(new Set(values));
  };

  // Analyze pattern: check if column values are concatenation of other columns
  const analyzePattern = (columnIndex: number): { isPattern: boolean; sourceColumns?: number[]; separator?: string } => {
    if (!csvData || csvData.rows.length === 0) return { isPattern: false };

    const column = csvData.headers[columnIndex];
    const firstRowValue = csvData.rows[0][columnIndex];

    if (!firstRowValue || firstRowValue.trim() === '') return { isPattern: false };

    // Try to find which columns contribute to this value and the separator
    // Test different separators
    const separators = ['', '_', '-', ' ', '.', '/', ':', '|'];

    for (const separator of separators) {
      // Try different combinations of source columns
      const possibleCombinations = findColumnCombinations(columnIndex, separator);

      for (const combination of possibleCombinations) {
        // Verify this pattern works across all rows
        const isConsistent = csvData.rows.every(row => {
          const targetValue = row[columnIndex];
          if (!targetValue) return false;

          const constructedValue = combination.columns
            .map(idx => row[idx])
            .filter(val => val && val.trim() !== '')
            .join(separator);

          return targetValue === constructedValue;
        });

        if (isConsistent) {
          return {
            isPattern: true,
            sourceColumns: combination.columns,
            separator: separator
          };
        }
      }
    }

    return { isPattern: false };
  };

  // Helper function to find possible column combinations that might form the target
  const findColumnCombinations = (targetColumnIndex: number, separator: string): Array<{ columns: number[] }> => {
    if (!csvData) return [];

    const firstRowValue = csvData.rows[0][targetColumnIndex];
    const combinations: Array<{ columns: number[] }> = [];

    // Find columns whose values appear in the first row's target value
    const candidateColumns: number[] = [];
    for (let i = 0; i < csvData.headers.length; i++) {
      if (i === targetColumnIndex) continue;

      const columnValue = csvData.rows[0][i];
      if (columnValue && columnValue.trim() !== '' && firstRowValue.includes(columnValue)) {
        candidateColumns.push(i);
      }
    }

    if (candidateColumns.length === 0) return [];

    // Try combinations of these columns
    // Start with all candidates in order they appear
    combinations.push({ columns: candidateColumns });

    // Try pairs
    for (let i = 0; i < candidateColumns.length; i++) {
      for (let j = i + 1; j < candidateColumns.length; j++) {
        combinations.push({ columns: [candidateColumns[i], candidateColumns[j]] });
      }
    }

    // Try individual columns
    candidateColumns.forEach(col => {
      combinations.push({ columns: [col] });
    });

    return combinations;
  };

  const generateAutoValue = (columnIndex: number, visited: Set<number> = new Set()): string => {
    if (!csvData) return '';

    // Prevent infinite recursion
    if (visited.has(columnIndex)) {
      return '';
    }

    visited.add(columnIndex);

    const header = csvData.headers[columnIndex];

    // Special case: if this is pyLabel and pyName has a custom/existing value, use it
    if (header === 'pyLabel') {
      const pyNameIndex = csvData.headers.findIndex(h => h === 'pyName');
      if (pyNameIndex !== -1) {
        const pyNameField = fieldValues['pyName'];
        if (pyNameField && (pyNameField.mode === 'custom' || pyNameField.mode === 'existing') && pyNameField.value) {
          return pyNameField.value;
        }
        // If pyName is also auto, try to generate its value
        if (pyNameField && pyNameField.mode === 'auto' && !visited.has(pyNameIndex)) {
          const pyNameValue = generateAutoValue(pyNameIndex, visited);
          if (pyNameValue && !pyNameValue.startsWith('[Auto:')) {
            return pyNameValue;
          }
        }
      }
    }

    const pattern = analyzePattern(columnIndex);

    if (pattern.isPattern && pattern.sourceColumns) {
      // Build value from source columns using the detected separator
      const values: string[] = [];

      pattern.sourceColumns.forEach(srcIdx => {
        const srcHeader = csvData.headers[srcIdx];
        const srcField = fieldValues[srcHeader];

        if (srcField) {
          let value = '';
          if (srcField.mode === 'auto') {
            value = generateAutoValue(srcIdx, visited);
          } else if (srcField.mode === 'existing' || srcField.mode === 'custom') {
            value = srcField.value;
          }

          if (value && !value.startsWith('[Auto:')) {
            values.push(value);
          }
        }
      });

      // Only return if we got values for all source columns
      if (values.length === pattern.sourceColumns.length) {
        return values.join(pattern.separator || '');
      }
    }

    // Check if all values are the same (constant)
    const uniqueValues = getUniqueValuesForColumn(columnIndex);
    if (uniqueValues.length === 1) {
      return uniqueValues[0];
    }

    // Check if this column matches another column (like pyName === pyLabel)
    for (let i = 0; i < csvData.headers.length; i++) {
      if (i === columnIndex) continue;

      const allMatch = csvData.rows.every(row => row[i] === row[columnIndex]);
      if (allMatch) {
        const otherHeader = csvData.headers[i];
        const otherField = fieldValues[otherHeader];
        if (otherField && !visited.has(i)) {
          if (otherField.mode === 'auto') {
            const generatedValue = generateAutoValue(i, visited);
            if (generatedValue && !generatedValue.startsWith('[Auto:')) {
              return generatedValue;
            }
          } else if (otherField.mode === 'existing' || otherField.mode === 'custom') {
            return otherField.value;
          }
        }
      }
    }

    return '';
  };

  const handleModeChange = (header: string, mode: FieldValue['mode']) => {
    setFieldValues(prev => {
      const updated = {
        ...prev,
        [header]: { mode, value: '' }
      };

      // If pyIsPropositionActive changes to "Always", clear StartDate and EndDate
      if (header === 'pyIsPropositionActive' && (mode === 'existing' || mode === 'custom')) {
        // We'll handle this in handleValueChange
      }

      return updated;
    });
  };

  const handleValueChange = (header: string, value: string) => {
    setFieldValues(prev => {
      const updated = {
        ...prev,
        [header]: { ...prev[header], value }
      };

      // If pyIsPropositionActive is set to "Always", automatically clear StartDate and EndDate
      if (header === 'pyIsPropositionActive' && value === 'Always') {
        if (csvData) {
          const startDateIndex = csvData.headers.findIndex(h => h === 'StartDate');
          const endDateIndex = csvData.headers.findIndex(h => h === 'EndDate');

          if (startDateIndex !== -1 && prev['StartDate']) {
            updated['StartDate'] = { mode: 'empty', value: '' };
          }
          if (endDateIndex !== -1 && prev['EndDate']) {
            updated['EndDate'] = { mode: 'empty', value: '' };
          }
        }
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!csvData) return;

    // Check for validation errors
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before saving.');
      return;
    }

    // Build new row array in the same order as headers
    const newRow: string[] = csvData.headers.map((header, columnIndex) => {
      const field = fieldValues[header];

      let value = '';
      if (field.mode === 'auto') {
        value = generateAutoValue(columnIndex);
      } else if (field.mode === 'empty') {
        value = '';
      } else {
        value = field.value;
      }

      // Apply date normalization to the value
      return normalizeDateString(value);
    });

    // When both StartDate and EndDate are provided, set pyIsPropositionActive to "Date" in the saved row.
    const pyIsPropositionActiveIndex = csvData.headers.findIndex(h => h === 'pyIsPropositionActive');
    const startDateIndex = csvData.headers.findIndex(h => h === 'StartDate');
    const endDateIndex = csvData.headers.findIndex(h => h === 'EndDate');
    if (pyIsPropositionActiveIndex !== -1 && startDateIndex !== -1 && endDateIndex !== -1) {
      const startVal = (newRow[startDateIndex] || '').trim();
      const endVal = (newRow[endDateIndex] || '').trim();
      if (startVal !== '' && endVal !== '') {
        newRow[pyIsPropositionActiveIndex] = 'Date';
      }
    }

    // Update CSV data with new row
    const updatedData = {
      ...csvData,
      rows: [...csvData.rows, newRow]
    };

    setCsvData(updatedData);

    // Store in-memory updates so switching between multiple channel CSVs doesn't lose changes.
    if (workflowMode === 'folder' && selectedFileName) {
      setMultiCsvUpdates({
        ...multiCsvUpdates,
        [selectedFileName]: updatedData,
      });

      const pyNameIndex = csvData.headers.findIndex(h => h === 'pyName');
      const rowPyName = pyNameIndex !== -1 ? newRow[pyNameIndex] : 'Unknown';
      setAddedRowsTracker(prev => ({
        ...prev,
        [selectedFileName]: [...(prev[selectedFileName] || []), rowPyName]
      }));
    }

    // Multi-file workflow (folder): step-by-step navigation.
    if (workflowMode === 'folder') {
      // Step: Offer
      if (workflowStep === 'offer') {
        toast.success('Offer added successfully');

        // Capture Offer pyName for downstream channel mapping.
        const pyNameIndexInOfferCsv = csvData.headers.findIndex(h => h === 'pyName');
        const newlyAddedOfferPyName = pyNameIndexInOfferCsv !== -1 ? newRow[pyNameIndexInOfferCsv] : null;
        setLastAddedOfferPyName(newlyAddedOfferPyName);

        // If OfferVariations CSV exists, go to OfferVariations step; otherwise go to Channels step.
        const offerVariationsFile = folderFiles.find(file => {
          const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedFileName.includes('offervariations') && !normalizedFileName.includes('offertooffervariations');
        });

        if (offerVariationsFile) {
          const offerVariationsFileName = offerVariationsFile.name;
          setWorkflowStep('offer-variations');
          setAddRowDefaults({});

          if (multiCsvUpdates[offerVariationsFileName]) {
            setCsvData(multiCsvUpdates[offerVariationsFileName]);
            setSelectedFileName(offerVariationsFileName);
          } else {
            const parsed = await parseCsvFile(offerVariationsFile);
            setCsvData(parsed);
            setSelectedFileName(offerVariationsFileName);
          }

          // Go to Variant Selection UI instead of generic add row
          navigate('/offer-variations');
          return;
        }

        // No OfferVariations CSV -> proceed to OfferToOfferVariations loop using default variant
        toast.info("OfferVariations file not found. Default OfferVariantDefault will be used.");

        const offerToVariationsFile = folderFiles.find(file => {
          const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedFileName.includes('offertooffervariations');
        });

        if (offerToVariationsFile) {
          const fileName = offerToVariationsFile.name;
          const defaultVariant = "OfferVariantDefault";
          setSelectedOfferVariants([defaultVariant]);
          setCurrentOfferVariantIndex(0);
          setWorkflowStep("offerto-offervariations");

          if (multiCsvUpdates[fileName]) {
            setCsvData(multiCsvUpdates[fileName]);
            setSelectedFileName(fileName);
          } else {
            const parsed = await parseCsvFile(offerToVariationsFile);
            setCsvData(parsed);
            setSelectedFileName(fileName);
          }

          setAddRowDefaults({
            pyName: `${newlyAddedOfferPyName}-${defaultVariant}`,
            pyLabel: `${newlyAddedOfferPyName}-${defaultVariant}`,
            OfferName: newlyAddedOfferPyName || '',
            OfferVariant: defaultVariant
          });

          return;
        }

        // Fallback to channels if OfferToOfferVariations doesn't exist either
        toast.info("OfferToOfferVariations file missing. Proceeding to Channels.");
        setWorkflowStep('channels');
        setAddRowDefaults({});
        navigate('/channels');
        return;
      }

      // Step: OfferVariations (skip handled via explicit Skip button)
      // When saving a new variant from AddRowForm, navigate back to Variant Selection.
      if (workflowStep === 'offer-variations') {
        navigate('/offer-variations');
        return;
      }

      // Step: OfferToOfferVariations loop
      if (workflowStep === 'offerto-offervariations') {
        toast.success('OfferToOfferVariations row added successfully');
        const nextIndex = currentOfferVariantIndex + 1;

        if (nextIndex < selectedOfferVariants.length) {
          setCurrentOfferVariantIndex(nextIndex);
          const nextVariant = selectedOfferVariants[nextIndex];
          setAddRowDefaults({
            pyName: `${lastAddedOfferPyName}-${nextVariant}`,
            pyLabel: `${lastAddedOfferPyName}-${nextVariant}`,
            OfferName: lastAddedOfferPyName || '',
            OfferVariant: nextVariant
          });
          return;
        }

        // Loop finished, continue to channels
        setWorkflowStep("channels");
        setAddRowDefaults({});
        navigate("/channels");
        return;
      }

      // Step: Channel offer (process selected channels sequentially)
      if (workflowStep === 'channel-offer') {
        const pyNameIndex = csvData.headers.findIndex(h => h === 'pyName');
        const channelOfferPyName = pyNameIndex !== -1 ? newRow[pyNameIndex] : null;

        if (channelOfferPyName) {
           setCreatedChannelOfferPyNames(prev => [...prev, channelOfferPyName]);
        }

        const nextIndex = currentChannelIndex + 1;
        if (nextIndex < selectedChannels.length) {
          const nextChannel = selectedChannels[nextIndex];
          const nextChannelFile = folderFiles.find(file => {
            const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedKeyword = String(nextChannel).toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedFileName.includes(normalizedKeyword);
          });

          if (!nextChannelFile) {
            toast.error(`Channel CSV not found for ${nextChannel}.`);
            return;
          }

          setCurrentChannelIndex(nextIndex);
          setWorkflowStep('channel-offer');

          const nextChannelFileName = nextChannelFile.name;
          if (multiCsvUpdates[nextChannelFileName]) {
            setCsvData(multiCsvUpdates[nextChannelFileName]);
            setSelectedFileName(nextChannelFileName);
          } else {
            const parsed = await parseCsvFile(nextChannelFile);
            setCsvData(parsed);
            setSelectedFileName(nextChannelFileName);
          }

          if (!lastAddedOfferPyName) {
            toast.error('Offer pyName is missing. Cannot build channel defaults.');
            return;
          }

          const offerName = lastAddedOfferPyName;
          const pyName = `${offerName}_${nextChannel}`;
          setAddRowDefaults({
            OfferName: offerName,
            pyName,
            pyLabel: pyName,
            ShortDescription: pyName,
          });

          navigate('/add-row');
          return;
        }

        // All selected channels processed -> proceed to TreatmentVariations step
        const allChannels = channelOfferPyName ? [...createdChannelOfferPyNames, channelOfferPyName] : createdChannelOfferPyNames;

        const tvFile = folderFiles.find(file => {
          const normalized = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalized.includes('treatmentvariations') && !normalized.includes('treatmenttotreatmentvariations');
        });

        if (tvFile) {
          const fileName = tvFile.name;
          setWorkflowStep('treatment-variations');
          setAddRowDefaults({});
          if (multiCsvUpdates[fileName]) {
            setCsvData(multiCsvUpdates[fileName]);
            setSelectedFileName(fileName);
          } else {
            const parsed = await parseCsvFile(tvFile);
            setCsvData(parsed);
            setSelectedFileName(fileName);
          }
          navigate('/treatment-variations');
          return;
        }

        // TreatmentVariations CSV missing -> Fallback
        toast.info("TreatmentVariations CSV not found. Defaulting to TreatmentVariantDefault.");
        setSelectedTreatmentVariants(["TreatmentVariantDefault"]);

        const combos = [];
        for (const ch of allChannels) {
           for (const tv of ["TreatmentVariantDefault"]) {
              for (const ov of selectedOfferVariants) {
                 combos.push({ treatmentName: ch, treatmentVariant: tv, offerVariant: ov });
              }
           }
        }
        setTreatmentCombos(combos);
        if (combos.length === 0) {
           toast.error("No valid combinations for TreatmentToTreatmentVariations.");
           setWorkflowStep('offer');
           setAddRowDefaults({});
           navigate('/offer-workflow');
           return;
        }

        const t2tFile = folderFiles.find(file => {
          const normalized = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalized.includes('treatmenttotreatmentvariations');
        });

        if (t2tFile) {
          const fileName = t2tFile.name;
          setCurrentTreatmentComboIndex(0);
          setWorkflowStep('treatmentto-treatmentvariations');
          if (multiCsvUpdates[fileName]) {
            setCsvData(multiCsvUpdates[fileName]);
            setSelectedFileName(fileName);
          } else {
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
          return; // Stay on add-row
        }
        
        toast.info("TreatmentToTreatmentVariations CSV missing. Process complete.");
        setWorkflowStep('offer');
        setAddRowDefaults({});
        navigate('/review-dashboard');
        return;
      }

      // Step: TreatmentVariations (When saving a new variant from AddRowForm)
      if (workflowStep === 'treatment-variations') {
        navigate('/treatment-variations');
        return;
      }

      // Step: TreatmentToTreatmentVariations loop
      if (workflowStep === 'treatmentto-treatmentvariations') {
        toast.success('TreatmentToTreatmentVariations row added successfully');
        const nextIndex = currentTreatmentComboIndex + 1;
        
        if (nextIndex < treatmentCombos.length) {
          setCurrentTreatmentComboIndex(nextIndex);
          const nextCombo = treatmentCombos[nextIndex];
          setAddRowDefaults({
            pyName: `${nextCombo.treatmentName}-${nextCombo.treatmentVariant}-${nextCombo.offerVariant}`,
            pyLabel: `${nextCombo.treatmentName}-${nextCombo.treatmentVariant}-${nextCombo.offerVariant}`,
            OfferName: lastAddedOfferPyName || '',
            OfferVariant: nextCombo.offerVariant,
            TreatmentName: nextCombo.treatmentName,
            TreatmentVariant: nextCombo.treatmentVariant
          });
          return;
        }

        toast.success("All Treatment configurations completed!");
        setWorkflowStep('offer');
        setAddRowDefaults({});
        navigate('/review-dashboard');
        return;
      }

      // Safety: never fall back to single-file routing while in folder workflow.
      toast.error('Unsupported folder workflow step.');
      return;
    }

    // Single-file workflow remains unchanged.
    toast.success('New row added successfully!');
    navigate('/csv-editor');
  };

  if (!csvData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-muted-foreground">No CSV data available</p>
      </div>
    );
  }

  // Compute whether pyIsPropositionActive will be auto-set to "Date" when both dates are provided (for UI notice).
  const startDateIndex = csvData.headers.findIndex(h => h === 'StartDate');
  const endDateIndex = csvData.headers.findIndex(h => h === 'EndDate');
  const pyIsPropositionActiveIndex = csvData.headers.findIndex(h => h === 'pyIsPropositionActive');
  const startDateField = fieldValues['StartDate'];
  const endDateField = fieldValues['EndDate'];
  const resolvedStartDate = startDateField?.mode === 'auto' ? generateAutoValue(startDateIndex) : (startDateField?.value || '');
  const resolvedEndDate = endDateField?.mode === 'auto' ? generateAutoValue(endDateIndex) : (endDateField?.value || '');
  const willAutoSetPyIsPropositionActiveToDate = pyIsPropositionActiveIndex !== -1 && startDateIndex !== -1 && endDateIndex !== -1 && resolvedStartDate.trim() !== '' && resolvedEndDate.trim() !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        {workflowMode !== 'folder' && (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to CSV Editor
          </Button>
        )}

        <div className="mb-6">
          <h1 className="mb-2">
            {workflowMode === 'folder'
              ? (workflowStep === 'offerto-offervariations' || workflowStep === 'treatmentto-treatmentvariations'
                ? `System - ${getCsvDisplayName(selectedFileName) || selectedFileName}`
                : getCsvDisplayName(selectedFileName) || 'Offer')
              : 'Add New Row'}
          </h1>
          {workflowMode === 'folder' && workflowStep === 'offerto-offervariations' && (
            <p className="font-semibold text-primary bg-primary/10 inline-block px-3 py-1 rounded-md mb-2">
              Offer: {lastAddedOfferPyName} | OfferVariant: {selectedOfferVariants[currentOfferVariantIndex]}
            </p>
          )}
          {workflowMode === 'folder' && workflowStep === 'treatmentto-treatmentvariations' && (
            <p className="font-semibold text-primary bg-primary/10 inline-block px-3 py-1 rounded-md mb-2">
              Treatment: {treatmentCombos[currentTreatmentComboIndex]?.treatmentName} | TreatmentVariant: {treatmentCombos[currentTreatmentComboIndex]?.treatmentVariant} | OfferVariant: {treatmentCombos[currentTreatmentComboIndex]?.offerVariant}
            </p>
          )}
          <p className="text-muted-foreground">
            Configure values for each column. Select from existing values, enter custom data,
            leave empty, or let the system auto-generate.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 mb-6">
          {/* Folder workflow: keep the configuration area compact with internal scroll */}
          <div className={workflowMode === 'folder' ? 'max-h-[60vh] overflow-y-auto pr-2 space-y-4' : 'max-h-[60vh] overflow-y-auto pr-2 space-y-6'}>
            {csvData.headers.map((header, columnIndex) => {
              const uniqueValues = getUniqueValuesForColumn(columnIndex);
              const currentField = fieldValues[header];

              // Check if this is StartDate or EndDate and if they should be disabled
              const isPropositionActiveField = fieldValues['pyIsPropositionActive'];
              const isPropositionActiveValue = isPropositionActiveField?.mode === 'auto'
                ? generateAutoValue(csvData.headers.findIndex(h => h === 'pyIsPropositionActive'))
                : isPropositionActiveField?.value || '';

              const isDateField = header === 'StartDate' || header === 'EndDate';
              const isDisabledByIsPropositionActive = isDateField && isPropositionActiveValue === 'Always';
              const isMandatoryField = header === 'pyName' || header === 'OfferName';
              const isPyIsPropositionActiveHeader = header === 'pyIsPropositionActive';
              const isPyIsPropositionActiveDisabledByDates =
                isPyIsPropositionActiveHeader && willAutoSetPyIsPropositionActiveToDate;

              return (
                <div key={columnIndex} className={workflowMode === 'folder' ? 'space-y-2' : 'space-y-3'}>
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      {header}
                      {isMandatoryField && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {isDisabledByIsPropositionActive && (
                      <Badge variant="outline" className="text-xs">
                        Disabled (pyIsPropositionActive is Always)
                      </Badge>
                    )}
                    {isPyIsPropositionActiveDisabledByDates && (
                      <Badge variant="outline" className="text-xs">
                        Auto-set to &quot;Date&quot; (based on StartDate and EndDate)
                      </Badge>
                    )}
                  </div>

                  {/* Mode Selection */}
                  <div className={workflowMode === 'folder' ? 'grid grid-cols-4 gap-1' : 'grid grid-cols-4 gap-2'}>
                    <Button
                      variant={currentField?.mode === 'existing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(header, 'existing')}
                      disabled={
                        uniqueValues.length === 0 ||
                        isDisabledByIsPropositionActive ||
                        isPyIsPropositionActiveDisabledByDates
                      }
                    >
                      Select Value
                    </Button>
                    <Button
                      variant={currentField?.mode === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(header, 'custom')}
                      disabled={isDisabledByIsPropositionActive || isPyIsPropositionActiveDisabledByDates}
                    >
                      Custom Value
                    </Button>
                    <Button
                      variant={currentField?.mode === 'empty' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(header, 'empty')}
                      disabled={isDisabledByIsPropositionActive || isPyIsPropositionActiveDisabledByDates}
                    >
                      Empty
                    </Button>
                    <Button
                      variant={currentField?.mode === 'auto' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(header, 'auto')}
                      disabled={isDisabledByIsPropositionActive || isPyIsPropositionActiveDisabledByDates}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Auto
                    </Button>
                  </div>

                  {/* Value Input based on mode */}
                  {currentField?.mode === 'existing' && (
                    <Select
                      value={currentField.value}
                      onValueChange={(value) => handleValueChange(header, value)}
                      disabled={isDisabledByIsPropositionActive || isPyIsPropositionActiveDisabledByDates}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a value..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueValues.map((value, idx) => (
                          <SelectItem key={idx} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {currentField?.mode === 'custom' && (
                    <Input
                      placeholder="Enter custom value..."
                      value={currentField.value}
                      onChange={(e) => handleValueChange(header, e.target.value)}
                      disabled={isDisabledByIsPropositionActive || isPyIsPropositionActiveDisabledByDates}
                    />
                  )}

                  {currentField?.mode === 'empty' && (
                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                      <span className="text-muted-foreground text-sm italic">
                        This field will be empty
                      </span>
                    </div>
                  )}

                  {currentField?.mode === 'auto' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between h-10 px-3 rounded-md border bg-primary/5">
                        <div className="flex items-center">
                          <Sparkles className="w-4 h-4 mr-2 text-primary" />
                          <span className="text-primary text-sm font-medium">
                            Auto-generated value:
                          </span>
                        </div>
                        <span className="text-primary text-sm font-mono">
                          {generateAutoValue(columnIndex) || '(empty)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Current selection preview */}
                  {currentField?.value && currentField.mode !== 'auto' && currentField.mode !== 'empty' && (
                    <Badge variant="secondary" className="text-xs">
                      Selected: {currentField.value}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Info: pyIsPropositionActive will be auto-set to "Date" when both dates are provided */}
        {willAutoSetPyIsPropositionActiveToDate && (
          <Alert className="mb-4 border-primary/50 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Auto-setting:</strong> Because both StartDate and EndDate are provided, <strong>pyIsPropositionActive</strong> will be automatically set to &quot;Date&quot; when you save.
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          {!(workflowMode === 'folder' && workflowStep !== 'offer') && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (workflowMode === 'folder') {
                  navigate('/offer-workflow'); // Always exit entire workflow
                } else {
                  navigate(-1);
                }
              }}
              className="flex-1"
            >
              {workflowMode === 'folder' ? 'Back' : 'Cancel'}
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleSave}
            className="flex-1"
            disabled={validationErrors.length > 0}
          >
            <Save className="w-5 h-5 mr-2" />
            Save New Row
          </Button>
        </div>
      </div>
    </div>
  );
}