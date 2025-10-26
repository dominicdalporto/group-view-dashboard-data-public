import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { ArrowLeft, Droplets, Edit } from "lucide-react";
import { useAwsData } from "@/hooks/useAwsData";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientService } from "@/services/patientService";

const updateRoomSchema = z.object({
  room: z.string().min(1, "Room is required"),
});

const updateNurseSchema = z.object({
  nurse: z.string().min(1, "Nurse is required"),
});

type UpdateRoomForm = z.infer<typeof updateRoomSchema>;
type UpdateNurseForm = z.infer<typeof updateNurseSchema>;

// Helper function for UTC formatting
// We use 'en-US' and force the timezone to UTC to keep the date intact
const formatUTCDate = (dateStr: string, options: Intl.DateTimeFormatOptions) => {
    // Create the Date object, which is already UTC (T00:00:00.000Z)
    const date = new Date(dateStr);
    
    // Use toLocaleDateString with timeZone: 'utc' to display the correct day
    return date.toLocaleDateString('en-US', { ...options, timeZone: 'utc' });
};


const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const { users, loading, error, allNurses, refreshData } = useAwsData();
  const navigate = useNavigate();
  
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editNurseOpen, setEditNurseOpen] = useState(false);
  
  // Find the user by ID
  const user = users.find(u => u.id === userId);

  // Set up forms
  const roomForm = useForm<UpdateRoomForm>({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: {
      room: user?.room || "",
    },
  });

  const nurseForm = useForm<UpdateNurseForm>({
    resolver: zodResolver(updateNurseSchema),
    defaultValues: {
      nurse: user?.nurse || "",
    },
  });

  // Update form values when user changes
  useEffect(() => {
    if (user) {
      roomForm.setValue("room", user.room);
      nurseForm.setValue("nurse", user.nurse);
    }
  }, [user, roomForm, nurseForm]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle room update
  const onUpdateRoom = async (data: UpdateRoomForm) => {
    if (!userId) return;
    
    try {
      await patientService.updatePatientRoom({
        userID: userId,
        room: data.room,
      });
      setEditRoomOpen(false);
      refreshData();
    } catch (err) {
      toast.error("Failed to update room");
    }
  };

  // Handle nurse update
  const onUpdateNurse = async (data: UpdateNurseForm) => {
    if (!userId) return;
    
    try {
      await patientService.updatePatientNurse({
        userID: userId,
        nurse: data.nurse,
        type: 'updateNurse',
      });
      setEditNurseOpen(false);
      refreshData();
    } catch (err) {
      toast.error("Failed to update nurse");
    }
  };
  
  // Format metrics for chart display
  const metricsData = user ? [
    { name: "Avg Daily (oz)", value: user.metrics.hydration },
    { name: "Days > 60oz", value: user.metrics.daysOver60oz },
    { name: "Total Days", value: user.metrics.totalDays }
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {/* User Header Information (omitted for brevity) */}
        {/* ... */}
        
        {/* User Details & Charts (omitted for brevity) */}
        {/* ... */}
        
        {loading ? (
            // Skeleton loading state (omitted for brevity)
            <div className="grid gap-4 md:grid-cols-2">
                {/* ... */}
            </div>
        ) : user ? (
          <div className="grid gap-6">
            {/* User Details & Patient Metrics (omitted for brevity) */}
            {/* ... */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Patient Details Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Patient Details</CardTitle>
                  <div className="flex space-x-2">
                    {/* Room Dialog */}
                    <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Room</DialogTitle>
                        </DialogHeader>
                        <Form {...roomForm}>
                          <form onSubmit={roomForm.handleSubmit(onUpdateRoom)} className="space-y-4">
                            <FormField
                              control={roomForm.control}
                              name="room"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Room Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="101" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="submit" disabled={roomForm.formState.isSubmitting}>
                                {roomForm.formState.isSubmitting ? "Updating..." : "Update Room"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Nurse Dialog */}
                    <Dialog open={editNurseOpen} onOpenChange={setEditNurseOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Droplets className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Nurse</DialogTitle>
                        </DialogHeader>
                        <Form {...nurseForm}>
                          <form onSubmit={nurseForm.handleSubmit(onUpdateNurse)} className="space-y-4">
                            <FormField
                              control={nurseForm.control}
                              name="nurse"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nurse</FormLabel>
                                  <Select 
                                    value={field.value} 
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a nurse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allNurses.map(nurse => (
                                        <SelectItem key={nurse} value={nurse}>{nurse}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="submit" disabled={nurseForm.formState.isSubmitting}>
                                {nurseForm.formState.isSubmitting ? "Updating..." : "Update Nurse"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-4 text-sm">
                    {/* Hydration Status */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Hydration Status</dt>
                      <dd>
                        <Badge
                          className={
                            user.status === "hydrated"
                              ? "bg-green-100 text-green-800"
                              : user.status === "mild dehydration"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {user.status}
                        </Badge>
                      </dd>
                    </div>
                    {/* Room */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Room</dt>
                      <dd>{user.room}</dd>
                    </div>
                    {/* Nurse */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Nurse</dt>
                      <dd>{user.nurse}</dd>
                    </div>
                    {/* Avg. Hydration */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Avg. Hydration</dt>
                      <dd className="font-bold">{user.metrics.hydration} oz/day</dd>
                    </div>
                    {/* Today */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Today</dt>
                      <dd>{user.metrics.todayOunces} oz</dd>
                    </div>
                    {/* 3-Day Total */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">3-Day Total</dt>
                      <dd>{user.metrics.threeDayOunces} oz</dd>
                    </div>
                    {/* 7-Day Total */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">7-Day Total</dt>
                      <dd>{user.metrics.sevenDayOunces} oz</dd>
                    </div>
                    {/* First Record */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">First Record</dt>
                      {/* FIX: Use formatUTCDate for joinDate */}
                      <dd>{formatUTCDate(user.joinDate, { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
                    </div>
                    {/* Last Record */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Last Record</dt>
                      {/* FIX: Use formatUTCDate for lastActive */}
                      <dd>{formatUTCDate(user.lastActive, { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
                    </div>
                    {/* Days Over 60oz */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Days Over 60oz</dt>
                      <dd>{user.metrics.daysOver60oz}</dd>
                    </div>
                    {/* Total Days */}
                    <div className="grid grid-cols-2">
                      <dt className="font-medium text-gray-500">Total Days</dt>
                      <dd>{user.metrics.totalDays}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              
              {/* User Metrics Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Patient Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Hydration Over Time</CardTitle>
                <CardDescription>Daily water intake (ounces)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={user.activityData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      // ✅ FIX 1: Use formatUTCDate to display the correct day on the axis ticks
                      tickFormatter={(date) => formatUTCDate(date, { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 12 }}
                      interval={4}
                    />
                    <YAxis 
                      domain={[0, 150]} 
                      label={{ 
                        value: 'Water (oz)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value} oz`, 'Water Intake']}
                      // ✅ FIX 2: Use formatUTCDate to display the correct day in the tooltip
                      labelFormatter={(label) => formatUTCDate(label, { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No patient data available</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserDetail;