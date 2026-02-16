import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  Server, 
  Check, 
  X,
  MoreHorizontal,
  Settings,
  Undo2,
  Phone,
  MessageSquare,
  Shield,
  FileWarning,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserManagement from "@/components/admin/UserManagement";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [alerts, setAlerts] = useState([]);
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [safetyStatus, setSafetyStatus] = useState(null);
  const [smsStatus, setSmsStatus] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [retractReason, setRetractReason] = useState('');
  const [retractingId, setRetractingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, pendingRes, safetyRes, smsRes, incidentRes, smsLogRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/alerts`).then(r => r.json()),
        fetch(`${API_URL}/admin/alerts/pending`).then(r => r.json()),
        fetch(`${API_URL}/admin/safety/status`).then(r => r.json()),
        fetch(`${API_URL}/api/sms/status`).then(r => r.json()),
        fetch(`${API_URL}/admin/incidents?limit=20`).then(r => r.json()),
        fetch(`${API_URL}/api/sms/audit-log?limit=20`).then(r => r.json()),
      ]);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value?.alerts || alertsRes.value || []);
      if (pendingRes.status === 'fulfilled') setPendingAlerts(pendingRes.value?.pending_alerts || []);
      if (safetyRes.status === 'fulfilled') setSafetyStatus(safetyRes.value);
      if (smsRes.status === 'fulfilled') setSmsStatus(smsRes.value);
      if (incidentRes.status === 'fulfilled') setIncidents(incidentRes.value?.incidents || []);
      if (smsLogRes.status === 'fulfilled') setSmsLogs(smsLogRes.value?.logs || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetract = async (alertId) => {
    if (!retractReason.trim()) { setActionFeedback('Please provide a retraction reason'); return; }
    try {
      const res = await fetch(`${API_URL}/admin/alerts/retract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, reason: retractReason, admin_user_id: 'admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(`Alert retracted. Correction SMS sent.`);
        setRetractingId(null);
        setRetractReason('');
        fetchData();
      } else {
        setActionFeedback(`Retraction failed: ${data.error || data.detail}`);
      }
    } catch (err) { setActionFeedback(`Error: ${err.message}`); }
  };

  const handleApprove = async (alertId, approved) => {
    try {
      const res = await fetch(`${API_URL}/admin/alerts/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, approved, admin_user_id: 'admin' }),
      });
      const data = await res.json();
      setActionFeedback(`Alert ${approved ? 'approved' : 'rejected'}: ${data.message}`);
      fetchData();
    } catch (err) { setActionFeedback(`Error: ${err.message}`); }
  };

  const handleResetFP = async (eventType) => {
    try {
      await fetch(`${API_URL}/admin/safety/reset/${eventType}`, { method: 'POST' });
      setActionFeedback(`False positives reset for ${eventType}`);
      fetchData();
    } catch (err) { setActionFeedback(`Error: ${err.message}`); }
  };

  const activeAlerts = Array.isArray(alerts) ? alerts.filter(a => a.is_active && !a.retracted) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">Manage users, approve alerts, and monitor system health.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Server className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-2">
            <Shield className="w-4 h-4" />
            Alert Safety
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <Phone className="w-4 h-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">System Status</p>
              <h4 className="text-xl font-bold text-green-600">Operational</h4>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <h4 className="text-xl font-bold">1,240</h4>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Reports</p>
              <h4 className="text-xl font-bold">15</h4>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <h4 className="text-xl font-bold">3</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Community Reports Approval</CardTitle>
            <CardDescription>Validate user submitted disaster reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div>Fire at Sector 3</div>
                    <div className="text-xs text-muted-foreground">2 mins ago</div>
                  </TableCell>
                  <TableCell>John Doe</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">High (98%)</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div>Water Logging</div>
                    <div className="text-xs text-muted-foreground">15 mins ago</div>
                  </TableCell>
                  <TableCell>Jane Smith</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium (65%)</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent System Logs */}
        <Card>
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>Recent automated actions and errors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="font-medium">Automated Alert Dispatched</p>
                  <p className="text-muted-foreground">Cyclone warning sent to 12,000 users in Sector 4.</p>
                  <p className="text-xs text-muted-foreground mt-1">10:42 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="flex-1">
                  <p className="font-medium">API Latency Spike</p>
                  <p className="text-muted-foreground">Weather API response time > 2000ms.</p>
                  <p className="text-xs text-muted-foreground mt-1">10:30 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="font-medium">Database Backup</p>
                  <p className="text-muted-foreground">Daily backup completed successfully.</p>
                  <p className="text-xs text-muted-foreground mt-1">09:00 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        {/* ═══════ ALERT SAFETY TAB ═══════ */}
        <TabsContent value="safety" className="space-y-6">
          {actionFeedback && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">{actionFeedback}</AlertDescription>
            </Alert>
          )}

          {/* Safety Engine Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Thresholds</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Auto-notify</span><Badge variant="outline" className="bg-red-50 text-red-700">≥ 0.70</Badge></div>
                  <div className="flex justify-between"><span>Admin review</span><Badge variant="outline" className="bg-yellow-50 text-yellow-700">0.45–0.70</Badge></div>
                  <div className="flex justify-between"><span>Monitor only</span><Badge variant="outline" className="bg-green-50 text-green-700">&lt; 0.45</Badge></div>
                  <div className="flex justify-between"><span>Vision auto</span><Badge variant="outline">≥ 0.85</Badge></div>
                  <div className="flex justify-between"><span>Vision review</span><Badge variant="outline">≥ 0.60</Badge></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FileWarning className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold">False Positives</h3>
                </div>
                {safetyStatus ? (
                  <div className="space-y-2 text-sm">
                    {Object.entries(safetyStatus.false_positive_counts || {}).length > 0 ? (
                      Object.entries(safetyStatus.false_positive_counts).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span>{type}: <strong>{count}</strong>/3</span>
                          <Button size="sm" variant="ghost" onClick={() => handleResetFP(type)} className="h-7 text-xs gap-1">
                            <RefreshCw className="w-3 h-3" /> Reset
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No false positives recorded</p>
                    )}
                    {safetyStatus.auto_disabled_types?.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                        <strong>⚠️ Auto-disabled:</strong> {safetyStatus.auto_disabled_types.join(', ')}
                      </div>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Loading...</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Active Alerts</h3>
                </div>
                <div className="text-3xl font-bold">{activeAlerts.length}</div>
                <p className="text-sm text-muted-foreground mt-1">{pendingAlerts.length} pending review</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts with Retract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Undo2 className="w-5 h-5" /> Alert Retraction (One-Click)
              </CardTitle>
              <CardDescription>Retract wrong alerts instantly. Correction SMS sent to all affected users.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAlerts.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No active alerts</TableCell></TableRow>
                  )}
                  {activeAlerts.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{alert.title}</TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.source || '—'}</TableCell>
                      <TableCell className="text-xs">{alert.created_at ? new Date(alert.created_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right">
                        {retractingId === alert.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <Input
                              placeholder="Reason for retraction"
                              value={retractReason}
                              onChange={e => setRetractReason(e.target.value)}
                              className="h-8 w-48 text-xs"
                            />
                            <Button size="sm" variant="destructive" onClick={() => handleRetract(alert.id)} className="h-8 text-xs">
                              Confirm Retract
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRetractingId(null); setRetractReason(''); }} className="h-8 text-xs">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRetractingId(alert.id)} className="h-8 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Undo2 className="w-3 h-3" /> Retract
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Review */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Review (Medium Confidence)</CardTitle>
              <CardDescription>Alerts between 0.45–0.70 confidence require manual review.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAlerts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No pending reviews</TableCell></TableRow>
                  )}
                  {pendingAlerts.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>{alert.alert_type}</TableCell>
                      <TableCell><Badge variant="outline">{alert.severity}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(alert.id, true)} className="h-8 text-xs text-green-600 hover:bg-green-50 gap-1">
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(alert.id, false)} className="h-8 text-xs text-red-600 hover:bg-red-50 gap-1">
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Incident Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Logs</CardTitle>
              <CardDescription>Audit trail of retractions, false positives, and corrective actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incidents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No incidents recorded</p>}
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full ${inc.type === 'retraction' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <div className="flex-1">
                      <p className="font-medium">{inc.type}: {inc.reason}</p>
                      <p className="text-muted-foreground text-xs">{inc.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{inc.created_at ? new Date(inc.created_at).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ SMS TAB ═══════ */}
        <TabsContent value="sms" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-full ${smsStatus?.twilio_available ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Twilio</p>
                  <h4 className="text-xl font-bold">{smsStatus?.twilio_available ? 'Connected' : 'Mock Mode'}</h4>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered Phones</p>
                  <h4 className="text-xl font-bold">{smsStatus?.registered_phones ?? '—'}</h4>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SMS Sent</p>
                  <h4 className="text-xl font-bold">{smsLogs.reduce((acc, l) => acc + (l.sent || 0), 0)}</h4>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SMS Dispatch Audit Log</CardTitle>
              <CardDescription>Every SMS sent or retracted, with timestamps and phone counts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Phones</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsLogs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No SMS dispatched yet</TableCell></TableRow>
                  )}
                  {smsLogs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={log.type === 'retraction' ? 'destructive' : 'default'}>{log.type}</Badge>
                      </TableCell>
                      <TableCell>{log.alert_type || '—'}</TableCell>
                      <TableCell>{log.risk_score?.toFixed(2) || '—'}</TableCell>
                      <TableCell>{log.phones_count}</TableCell>
                      <TableCell className="text-green-600 font-semibold">{log.sent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
