import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Database,
  BarChart3,
  Key,
  Code,
  FileSpreadsheet,
  FilePdf,
  FileJson,
  TrendingUp,
  Activity,
  Users,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";

const ScientistPortal = () => {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Mock API key
  const apiKey = "sk_suraksha_prod_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c";

  // Available datasets for export
  const exportableDatasets = [
    {
      id: 'weather',
      name: 'Weather Data',
      description: 'Comprehensive weather observations and forecasts',
      records: '1.2M',
      lastUpdated: '2026-02-10',
      size: '450 MB'
    },
    {
      id: 'seismic',
      name: 'Seismic Activity',
      description: 'Earthquake records and seismograph data',
      records: '85K',
      lastUpdated: '2026-02-09',
      size: '120 MB'
    },
    {
      id: 'cyclone',
      name: 'Cyclone Tracks',
      description: 'Historical cyclone paths and intensity data',
      records: '12K',
      lastUpdated: '2026-02-08',
      size: '35 MB'
    },
    {
      id: 'flood',
      name: 'Flood Zones',
      description: 'Flood risk areas and historical flood data',
      records: '240K',
      lastUpdated: '2026-02-10',
      size: '180 MB'
    },
    {
      id: 'aqi',
      name: 'Air Quality Index',
      description: 'Real-time and historical air quality measurements',
      records: '3.5M',
      lastUpdated: '2026-02-10',
      size: '680 MB'
    }
  ];

  // Analytics stats
  const analyticsData = {
    totalDataPoints: '5.2M',
    activeSensors: '1,234',
    modelsDeployed: '18',
    apiCalls30Days: '45,678',
    accuracy: '94.2%',
    uptime: '99.8%'
  };

  // Research tools
  const tools = [
    {
      id: 1,
      name: 'Predictive Model API',
      description: 'Access our ML models for disaster prediction',
      endpoint: '/api/v1/predict',
      status: 'active'
    },
    {
      id: 2,
      name: 'Historical Data API',
      description: 'Query historical disaster data',
      endpoint: '/api/v1/historical',
      status: 'active'
    },
    {
      id: 3,
      name: 'Real-time Alerts API',
      description: 'Subscribe to real-time disaster alerts',
      endpoint: '/api/v1/alerts/stream',
      status: 'active'
    },
    {
      id: 4,
      name: 'Geospatial Analysis API',
      description: 'Perform GIS operations on disaster data',
      endpoint: '/api/v1/geospatial',
      status: 'beta'
    }
  ];

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const handleExportData = async (datasetId, format) => {
    setIsExporting(true);
    toast.info(`Preparing ${format.toUpperCase()} export...`);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`${datasetId} data exported successfully as ${format.toUpperCase()}!`);
    }, 2000);
  };

  const handleRegenerateApiKey = () => {
    toast.success('New API key generated! Update your applications.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border-2 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Scientist Research Portal
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Advanced tools for disaster research and data analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-4 py-2">
            <Activity className="w-4 h-4 mr-2" />
            API Status: Active
          </Badge>
          <Badge variant="secondary" className="px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            Researcher Level
          </Badge>
        </div>
      </motion.div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Data Export
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API Access
          </TabsTrigger>
        </TabsList>

        {/* Data Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Export Datasets
              </CardTitle>
              <CardDescription>
                Download disaster data in multiple formats for your research
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Export Format Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Select Export Format</label>
                <div className="flex gap-3">
                  <Button
                    variant={selectedExportFormat === 'csv' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportFormat('csv')}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={selectedExportFormat === 'json' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportFormat('json')}
                    className="flex-1"
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                  <Button
                    variant={selectedExportFormat === 'pdf' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportFormat('pdf')}
                    className="flex-1"
                  >
                    <FilePdf className="w-4 h-4 mr-2" />
                    PDF Report
                  </Button>
                </div>
              </div>

              {/* Available Datasets */}
              <div className="space-y-3">
                {exportableDatasets.map((dataset, index) => (
                  <motion.div
                    key={dataset.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{dataset.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{dataset.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {dataset.records} records
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {dataset.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Updated {dataset.lastUpdated}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExportData(dataset.id, selectedExportFormat)}
                      disabled={isExporting}
                      className="ml-4"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0 }}
            >
              <Card className="border-2 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Data Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{analyticsData.totalDataPoints}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all datasets</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Sensors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{analyticsData.activeSensors}</div>
                  <p className="text-xs text-muted-foreground mt-1">Live data streams</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Model Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{analyticsData.accuracy}</div>
                  <p className="text-xs text-muted-foreground mt-1">Prediction accuracy</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Performance */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                System Performance
              </CardTitle>
              <CardDescription>Real-time analytics and metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">API Uptime (30 days)</span>
                  <span className="font-bold text-green-600">{analyticsData.uptime}</span>
                </div>
                <Progress value={99.8} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Data Processing Rate</span>
                  <span className="font-bold text-blue-600">2,340 records/sec</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Storage Utilization</span>
                  <span className="font-bold text-purple-600">4.2 TB / 10 TB</span>
                </div>
                <Progress value={42} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analyticsData.modelsDeployed}</div>
                  <div className="text-xs text-muted-foreground">ML Models</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analyticsData.apiCalls30Days}</div>
                  <div className="text-xs text-muted-foreground">API Calls (30d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">156</div>
                  <div className="text-xs text-muted-foreground">Data Sources</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">24/7</div>
                  <div className="text-xs text-muted-foreground">Monitoring</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Access Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* API Key Management */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-600" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Manage your API credentials and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your API Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                    {apiKey}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyApiKey}
                  >
                    {apiKeyCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Keep your API key secure. Never share it publicly.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleRegenerateApiKey}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Key
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Usage Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available APIs */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                Available Research APIs
              </CardTitle>
              <CardDescription>
                Access our comprehensive disaster data and prediction services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tool.name}</h3>
                          <Badge variant={tool.status === 'active' ? 'default' : 'secondary'}>
                            {tool.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tool.endpoint}
                        </code>
                      </div>
                      <Button variant="outline" size="sm" className="ml-4">
                        <FileText className="w-4 h-4 mr-2" />
                        Docs
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Start Code */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-green-600" />
                Quick Start Code
              </CardTitle>
              <CardDescription>Sample code to get started with our API</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {`import requests

# Set your API key
API_KEY = "${apiKey}"
BASE_URL = "https://api.suraksha-setu.com"

# Example: Get earthquake predictions
response = requests.get(
    f"{BASE_URL}/api/v1/predict/earthquake",
    headers={"Authorization": f"Bearer {API_KEY}"}
)

data = response.json()
print(f"Prediction: {data['risk_level']}")
print(f"Confidence: {data['confidence']}%")`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScientistPortal;
