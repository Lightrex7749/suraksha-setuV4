import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Download, FileSpreadsheet, FileText, Calendar,
  Filter, Loader2, CheckCircle2, Database,
  TrendingUp, Cloud, Droplets, Wind
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const DataExport = () => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('7days');
  const [selectedDataTypes, setSelectedDataTypes] = useState({
    weather: true,
    aqi: true,
    alerts: true,
    disasters: true,
    earthquakes: false,
    cyclones: false
  });

  const dataTypes = [
    { id: 'weather', label: 'Weather Data', icon: Cloud, color: 'text-blue-600' },
    { id: 'aqi', label: 'Air Quality Index', icon: Wind, color: 'text-green-600' },
    { id: 'alerts', label: 'Active Alerts', icon: TrendingUp, color: 'text-orange-600' },
    { id: 'disasters', label: 'Disaster Events', icon: TrendingUp, color: 'text-red-600' },
    { id: 'earthquakes', label: 'Earthquake Records', icon: TrendingUp, color: 'text-purple-600' },
    { id: 'cyclones', label: 'Cyclone Data', icon: Droplets, color: 'text-cyan-600' }
  ];

  const dateRanges = [
    { value: '24hours', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  const handleDataTypeToggle = (typeId) => {
    setSelectedDataTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const getSelectedTypes = () => {
    return Object.keys(selectedDataTypes).filter(key => selectedDataTypes[key]);
  };

  const handleExport = async () => {
    const selectedTypes = getSelectedTypes();
    
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    setExporting(true);

    try {
      // Generate sample data for demo
      const response = await generateSampleExport(exportFormat, dateRange, selectedTypes);
      
      // In production, this would call the backend:
      // const response = await axios.post(`${API_URL}/scientist/export-${exportFormat}`, {
      //   dateRange,
      //   dataTypes: selectedTypes
      // }, { responseType: 'blob' });

      // Create download link
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `suraksha_data_${dateRange}_${Date.now()}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${exportFormat.toUpperCase()} file downloaded successfully!`, {
        description: `${selectedTypes.length} data types exported for ${dateRange}`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setExporting(false);
    }
  };

  // Demo function to generate sample CSV/PDF
  const generateSampleExport = async (format, range, types) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (format === 'csv') {
          // Generate CSV
          let csvContent = 'Data Type,Timestamp,Value,Location,Status\n';
          
          types.forEach(type => {
            for (let i = 0; i < 10; i++) {
              const timestamp = new Date(Date.now() - i * 86400000).toISOString();
              csvContent += `${type},${timestamp},${Math.random() * 100},Bhubaneswar,Active\n`;
            }
          });

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          resolve(blob);
        } else {
          // Generate simple PDF (in production, use a library like jsPDF)
          const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
100 700 Td
(Suraksha Setu Data Export Report) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
0000000308 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
456
%%EOF`;

          const blob = new Blob([pdfContent], { type: 'application/pdf' });
          resolve(blob);
        }
      }, 1500);
    });
  };

  const selectedCount = getSelectedTypes().length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Configure Export
            </CardTitle>
            <CardDescription>
              Select data types and date range for your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Export Format */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('csv')}
                  className="justify-start gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('pdf')}
                  className="justify-start gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Types */}
            <div className="space-y-3">
              <Label>Data Types ({selectedCount} selected)</Label>
              <div className="space-y-2">
                {dataTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={type.id}
                      checked={selectedDataTypes[type.id]}
                      onCheckedChange={() => handleDataTypeToggle(type.id)}
                    />
                    <label
                      htmlFor={type.id}
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                    >
                      <type.icon className={`w-4 h-4 ${type.color}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </label>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={exporting || selectedCount === 0}
              className="w-full gap-2"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating {exportFormat.toUpperCase()}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export Preview/Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Export Summary
            </CardTitle>
            <CardDescription>
              Review your export configuration before downloading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format Info */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Format:</span>
                <Badge variant="outline" className="gap-1">
                  {exportFormat === 'csv' ? (
                    <FileSpreadsheet className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  {exportFormat.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Date Range:</span>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateRanges.find(r => r.value === dateRange)?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Types:</span>
                <Badge variant="outline">{selectedCount} selected</Badge>
              </div>
            </div>

            {/* Selected Data Types */}
            <div className="space-y-2">
              <Label className="text-sm">Included Data:</Label>
              <div className="space-y-1">
                {getSelectedTypes().length > 0 ? (
                  getSelectedTypes().map((typeId) => {
                    const type = dataTypes.find(t => t.id === typeId);
                    return (
                      <div
                        key={typeId}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
                    No data types selected
                  </p>
                )}
              </div>
            </div>

            {/* Format Details */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                {exportFormat === 'csv' ? '📊 CSV Format' : '📄 PDF Format'}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {exportFormat === 'csv'
                  ? 'Comma-separated values file. Perfect for data analysis in Excel, Google Sheets, or statistical software like R and Python.'
                  : 'Portable Document Format. Ideal for reports, presentations, and archiving. Includes charts and formatted tables.'}
              </p>
            </div>

            {/* Usage Examples */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-purple-900 dark:text-purple-100">
                💡 Suggested Use Cases
              </h4>
              <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                <li>• Research papers and academic publications</li>
                <li>• Statistical analysis and trend forecasting</li>
                <li>• Government compliance reports</li>
                <li>• Historical disaster pattern studies</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Recent Exports
          </CardTitle>
          <CardDescription>
            Your previously generated export files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'weather_aqi_7days.csv', date: '2 hours ago', size: '2.3 MB', type: 'csv' },
              { name: 'disaster_report_30days.pdf', date: 'Yesterday', size: '5.1 MB', type: 'pdf' },
              { name: 'complete_data_90days.csv', date: '3 days ago', size: '8.7 MB', type: 'csv' }
            ].map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {file.type === 'csv' ? (
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                      <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded">
                      <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size} • {file.date}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExport;
