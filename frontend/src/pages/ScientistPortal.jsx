import React, { useState } from 'react';
import {
  Database,
  UploadCloud,
  LineChart,
  GitBranch,
  Microscope,
  FileText,
  Download,
  Upload,
  Play,
  Save,
  FolderOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

const ScientistPortal = () => {
  const [uploadingData, setUploadingData] = useState(false);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  const handleUploadDataset = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploadingData(true);
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('http://localhost:8000/api/scientist/upload-dataset', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (response.ok) {
          toast.success(`Dataset "${file.name}" uploaded successfully`);
        } else {
          toast.error('Upload failed');
        }
      } catch (error) {
        toast.error('Error uploading dataset');
      } finally {
        setUploadingData(false);
      }
    };
    input.click();
  };

  const handleRunSimulation = async () => {
    setRunningSimulation(true);
    try {
      const response = await fetch('http://localhost:8000/api/scientist/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel || 'flood_prediction',
          parameters: {
            timesteps: 100,
            region: 'all'
          }
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Simulation completed: ${result.predictions_count} predictions generated`);
      } else {
        toast.error('Simulation failed');
      }
    } catch (error) {
      toast.error('Error running simulation');
    } finally {
      setRunningSimulation(false);
    }
  };

  const handleExportModel = async (modelId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/scientist/export-model/${modelId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${modelId}_model.pkl`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Model exported successfully');
      }
    } catch (error) {
      toast.error('Error exporting model');
    }
  };

  const handleImportModel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pkl,.h5,.pt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('http://localhost:8000/api/scientist/import-model', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (response.ok) {
          toast.success(`Model "${file.name}" imported successfully`);
        } else {
          toast.error('Import failed');
        }
      } catch (error) {
        toast.error('Error importing model');
      }
    };
    input.click();
  };

  const models = [
    {
      id: 'flood_prediction',
      name: 'Flood Prediction Model v2.1',
      type: 'Random Forest Regressor',
      description: 'Predicts water levels based on rainfall intensity and upstream dam release data.',
      accuracy: 94.2,
      status: 'active'
    },
    {
      id: 'cyclone_tracker',
      name: 'Cyclone Path Predictor',
      type: 'LSTM Neural Network',
      description: 'Forecasts cyclone trajectory using historical satellite imagery and wind patterns.',
      accuracy: 89.7,
      status: 'active'
    },
    {
      id: 'earthquake_early',
      name: 'Earthquake Early Warning',
      type: 'Ensemble Model',
      description: 'Detects P-wave anomalies to provide 10-30 second advance warning before major seismic events.',
      accuracy: 91.5,
      status: 'training'
    },
    {
      id: 'landslide_risk',
      name: 'Landslide Risk Assessment',
      type: 'Gradient Boosting',
      description: 'Analyzes soil moisture, terrain slope, and recent rainfall to predict landslide probability.',
      accuracy: 87.3,
      status: 'active'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scientist Research Hub</h1>
          <p className="text-muted-foreground">Advanced data analysis, modeling, and prediction tools.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleUploadDataset}
            disabled={uploadingData}
          >
            {uploadingData ? (
              <AlertCircle className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            {uploadingData ? 'Uploading...' : 'Upload Dataset'}
          </Button>
          <Button 
            className="gap-2"
            onClick={handleRunSimulation}
            disabled={runningSimulation}
          >
            {runningSimulation ? (
              <AlertCircle className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            {runningSimulation ? 'Running...' : 'Run Simulation'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="analysis">Data Analysis</TabsTrigger>
          <TabsTrigger value="models">Predictive Models</TabsTrigger>
          <TabsTrigger value="simulation">Raw Simulation</TabsTrigger>
          <TabsTrigger value="reports">Research Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Timeseries Anomaly Detection</CardTitle>
                <CardDescription>Real-time sensor data from monitoring stations.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] bg-muted/20 flex items-center justify-center border rounded-lg">
                <div className="text-center text-muted-foreground">
                  <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Interactive D3.js / Recharts Graph Area</p>
                  <p className="text-xs mt-2">Showing PM2.5 spikes correlated with wind direction</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">IMD Weather API</p>
                        <p className="text-xs text-muted-foreground">Live Stream • 50ms latency</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">IoT Sensor Grid A</p>
                        <p className="text-xs text-muted-foreground">Updated 2m ago</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Historical Flood Data</p>
                        <p className="text-xs text-muted-foreground">Static Dataset (CSV)</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Tools</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <FileText className="w-5 h-5" />
                    Export CSV
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Download className="w-5 h-5" />
                    Download Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="mb-6 flex justify-end">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleImportModel}
            >
              <Upload className="w-4 h-4" />
              Import Model
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {models.map((model) => (
              <Card 
                key={model.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedModel(model.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Microscope className="w-5 h-5 text-primary" />
                    {model.name}
                  </CardTitle>
                  <CardDescription>{model.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="font-medium">Accuracy: {model.accuracy}%</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      model.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {model.status === 'active' ? (
                        <><CheckCircle className="w-3 h-3 inline mr-1" />Active</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 inline mr-1" />Training</>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Play className="w-4 h-4 mr-1" />
                      Run Model
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportModel(model.id);
                      }}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Data Simulation</CardTitle>
              <CardDescription>Run custom simulations with uploaded datasets and models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Simulation Parameters</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Model</label>
                      <select className="w-full p-2 border rounded">
                        <option>Flood Prediction Model v2.1</option>
                        <option>Cyclone Path Predictor</option>
                        <option>Earthquake Early Warning</option>
                        <option>Landslide Risk Assessment</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Region</label>
                      <select className="w-full p-2 border rounded">
                        <option>All Regions</option>
                        <option>North India</option>
                        <option>Coastal Areas</option>
                        <option>Himalayan Belt</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Time Steps</label>
                      <input 
                        type="number" 
                        defaultValue={100} 
                        className="w-full p-2 border rounded"
                        min="10"
                        max="1000"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Data Sources</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm">Historical Weather Data</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm">Sensor Grid Readings</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm">Satellite Imagery</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <Button variant="outline" className="w-full mt-2">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Add Custom Dataset
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleRunSimulation}
                  disabled={runningSimulation}
                >
                  {runningSimulation ? (
                    <>
                      <AlertCircle className="w-5 h-5 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Simulation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Simulations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Flood Prediction - Delhi NCR</p>
                    <p className="text-sm text-muted-foreground">Completed 2 hours ago • 500 predictions</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Cyclone Track - Bay of Bengal</p>
                    <p className="text-sm text-muted-foreground">Completed 1 day ago • 1,200 predictions</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Monsoon Impact Analysis 2025</CardTitle>
                <CardDescription>Comprehensive flood risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on 3 months of simulation data across 12 states
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Seismic Activity Report Q1</CardTitle>
                <CardDescription>Earthquake prediction accuracy metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Analysis of 247 seismic events and model performance
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>Cyclone Pattern Study</CardTitle>
                <CardDescription>Historical trajectory analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  10-year cyclone data with prediction model validation
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScientistPortal;
