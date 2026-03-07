import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, File, FolderOpen, X, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Home() {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setUploadedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpdateData = () => {
    // Find first CSV file
    const csvFile = uploadedFiles.find(file => 
      file.name.toLowerCase().endsWith('.csv')
    );
    
    if (csvFile) {
      // Parse CSV and navigate
      parseAndNavigate(csvFile);
    } else {
      // Navigate anyway if no CSV
      navigate('/csv-editor', { state: { files: uploadedFiles } });
    }
  };

  const parseAndNavigate = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        navigate('/csv-editor', { state: { files: uploadedFiles } });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim())
      );

      // Navigate with parsed data
      navigate('/csv-editor', { 
        state: { 
          files: uploadedFiles,
          csvData: { headers, rows },
          fileName: file.name
        } 
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      navigate('/csv-editor', { state: { files: uploadedFiles } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-4">Offer Catalogue Update Portal</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your catalogue files or folders to update the offer database. 
            Drag and drop or select files from your device to get started.
          </p>
        </div>

        {/* File Uploader */}
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore - webkitdirectory is not in the standard types
            webkitdirectory=""
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drop zone */}
          <Card
            className={`p-12 border-2 border-dashed transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3>Drag and drop files or folders here. For multiple files, select a folder. For single file, select a file.</h3>
                <p className="text-muted-foreground text-sm">
                  or choose from your device
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="default"
                >
                  <File className="w-4 h-4 mr-2" />
                  Select A File
                </Button>
                <Button
                  onClick={() => folderInputRef.current?.click()}
                  variant="outline"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Select Folder
                </Button>
              </div>
            </div>
          </Card>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3>Uploaded Files ({uploadedFiles.length})</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Submit button */}
          {uploadedFiles.length > 0 && (
            <Button className="w-full" size="lg" onClick={handleUpdateData}>
              Proceed To Update Decision Data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}