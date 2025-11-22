import React from 'react';
import { 
  Database, 
  UploadCloud, 
  LineChart, 
  GitBranch, 
  Microscope,
  FileText,
  Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ScientistPortal = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scientist Research Hub</h1>
          <p className="text-muted-foreground">Advanced data analysis, modeling, and prediction tools.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <UploadCloud className="w-4 h-4" /> Upload Dataset
          </Button>
          <Button className="gap-2">
            <GitBranch className="w-4 h-4" /> Run Simulation
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="analysis">Data Analysis</TabsTrigger>
          <TabsTrigger value="models">Predictive Models</TabsTrigger>
          <TabsTrigger value="reports">Research Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Timeseries Anomaly Detection</CardTitle>
                <CardDescription>Real-time sensor data from Sector 4 monitoring station.</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="w-5 h-5 text-primary" />
                  Flood Prediction Model v2.1
                </CardTitle>
                <CardDescription>Random Forest Regressor</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Predicts water levels based on rainfall intensity and upstream dam release data.</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Accuracy: 94.2%</span>
                  <Button size="sm">Run Model</Button>
                </div>
              </CardContent>
            </Card>
            {/* More models... */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScientistPortal;
