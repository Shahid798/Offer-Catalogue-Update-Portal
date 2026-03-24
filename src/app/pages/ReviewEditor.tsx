import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ReviewEditor() {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const { multiCsvUpdates, setMultiCsvUpdates } = useCSV();

  const [localRows, setLocalRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const decodedFileName = fileName ? decodeURIComponent(fileName) : '';

  useEffect(() => {
    if (decodedFileName && multiCsvUpdates[decodedFileName]) {
      const data = multiCsvUpdates[decodedFileName];
      setHeaders(data.headers);
      setLocalRows(data.rows.map(row => [...row])); // deep copy primitive grid
    } else {
      toast.error("File not found in active configurations.");
      navigate("/review-dashboard");
    }
  }, [decodedFileName, multiCsvUpdates, navigate]);

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setLocalRows(prev => {
      const newGrid = [...prev];
      newGrid[rowIndex] = [...newGrid[rowIndex]];
      newGrid[rowIndex][colIndex] = value;
      return newGrid;
    });
  };

  const handleSave = () => {
    if (!decodedFileName) return;
    setMultiCsvUpdates({
      ...multiCsvUpdates,
      [decodedFileName]: {
        headers,
        rows: localRows
      }
    });
    toast.success(`Modifications to ${decodedFileName} saved successfully!`);
    navigate("/review-dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 py-8 px-4">
      <div className="max-w-[95%] mx-auto w-full flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/review-dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="space-x-4">
             <Button variant="outline" onClick={() => navigate("/review-dashboard")}>
               Cancel
             </Button>
             <Button onClick={handleSave}>
               💾 Save Changes
             </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Review Mode: {decodedFileName}</h1>

        <Card className="flex-1 overflow-auto rounded-md shadow-sm border border-slate-300 bg-white">
           <table className="w-full border-collapse">
             <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
               <tr>
                 {headers.map((h, i) => (
                   <th key={i} className="border-b border-r p-2 text-left text-sm font-semibold text-slate-700 min-w-[150px] whitespace-nowrap">
                     {h}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {localRows.map((row, rIdx) => (
                 <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                   {row.map((cell, cIdx) => (
                     <td key={cIdx} className="border-b border-r p-0">
                       <input 
                         className="w-full h-full p-2 outline-none focus:ring-2 focus:ring-primary focus:z-20 relative bg-transparent text-sm"
                         value={cell}
                         onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                       />
                     </td>
                   ))}
                 </tr>
               ))}
               {localRows.length === 0 && (
                 <tr>
                   <td colSpan={headers.length} className="text-center p-8 text-slate-500">
                     No rows generated for this file yet.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
        </Card>
      </div>
    </div>
  );
}
