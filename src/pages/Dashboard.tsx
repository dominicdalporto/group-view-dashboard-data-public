
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, Droplets, ArrowDown, ArrowUp, ClipboardList, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAwsData } from "@/hooks/useAwsData";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { users, loading, error, userGroup, nurses, totalDehydrated } = useAwsData();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Calculate total users
  const totalUsers = users.length;
  
  // Calculate total nurses
  const totalNurseCount = nurses.length;

  // Some metrics for the dashboard
  const metrics = [
    { 
      title: "Total Patients", 
      value: totalUsers, 
      icon: Users, 
      change: "+2.5%", 
      trend: "up",
      onClick: () => navigate('/dashboard/patients')
    },
    { 
      title: "Total Nurses", 
      value: totalNurseCount, 
      icon: ClipboardList, 
      change: "+1.2%", 
      trend: "up",
      onClick: () => navigate('/dashboard/nurses') 
    },
    { 
      title: "Dehydrated Patients", 
      value: totalDehydrated, 
      icon: AlertTriangle, 
      change: "-3.1%", 
      trend: "down",
      onClick: () => navigate('/dashboard/patients?status=dehydrated') 
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Hydration Dashboard</h1>
          {userGroup && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Group: {userGroup}
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-12 w-24" />
                  </CardContent>
                </Card>
              ))
            : metrics.map((metric, i) => (
                <Card key={i} className="cursor-pointer hover:bg-gray-50" onClick={metric.onClick}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-gray-500 font-medium">
                        {metric.title}
                      </CardTitle>
                      <metric.icon className="h-4 w-4 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <div className={`ml-2 flex items-center text-sm ${
                        metric.trend === 'up' ? 'text-green-500' : 
                        metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {metric.trend === 'up' ? <ArrowUp className="h-4 w-4 mr-0.5" /> : 
                         metric.trend === 'down' ? <ArrowDown className="h-4 w-4 mr-0.5" /> : null}
                        <span>{metric.change}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Patients Overview */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-xl font-semibold">Patients</h2>
          <Button onClick={() => navigate('/dashboard/patients')}>View All Patients</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-4 w-full" />
                    <div className="mt-2 flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : users.slice(0, 6).map((user) => (
                <Card 
                  key={user.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/dashboard/patient/${user.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle>{user.name}</CardTitle>
                    <div className="text-sm text-gray-500">Room: {user.room}, Nurse: {user.nurse}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        user.status === 'hydrated' ? 'text-green-500' :
                        user.status === 'mild dehydration' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {user.metrics.todayOunces} oz today
                      </span>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        user.status === 'hydrated' ? 'bg-green-100 text-green-600' :
                        user.status === 'mild dehydration' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                      }`}>
                        <Droplets size={16} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Nurses Overview */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-xl font-semibold">Nurses</h2>
          <Button onClick={() => navigate('/dashboard/nurses')}>View All Nurses</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-4 w-full" />
                    <div className="mt-2">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : nurses.slice(0, 3).map((nurse) => (
                <Card 
                  key={nurse.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate('/dashboard/nurses')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle>{nurse.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500 mb-2">
                      {nurse.patientCount} Patient{nurse.patientCount !== 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {nurse.patients.slice(0, 3).map(patient => (
                        <div 
                          key={patient.id}
                          className={`text-xs px-2 py-1 rounded-full ${
                            patient.hydrationStatus === 'hydrated' ? 'bg-green-100 text-green-700' :
                            patient.hydrationStatus === 'mild dehydration' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}
                        >
                          {patient.name}
                        </div>
                      ))}
                      {nurse.patients.length > 3 && (
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          +{nurse.patients.length - 3} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
