
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAwsData } from "@/hooks/useAwsData";
import { toast } from "sonner";
import { Droplets, Plus, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { patientService } from "@/services/patientService";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

// Create a schema for the patient form
const patientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  weight: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Weight must be a positive number",
  }),
  height: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Height must be a positive number",
  }),
  birthday: z.string().min(1, "Birthday is required"),
  gender: z.string().min(1, "Gender is required"),
  deviceSerial: z.string().optional(),
  nurse: z.string().optional(),
  room: z.string().optional(),
});

type PatientForm = z.infer<typeof patientFormSchema>;

// Define column visibility state type
type TableColumn = 'name' | 'room' | 'nurse' | 'status' | 'todayOz' | 'threeDayOz' | 'sevenDayOz' | 'avgOz' | 'analytics';

const Patients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedNurse, setSelectedNurse] = useState<string | null>(
    searchParams.get("nurse") || null
  );
  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    searchParams.get("status") || null
  );
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<TableColumn, boolean>>({
    name: true,
    room: true,
    nurse: true,
    status: true,
    todayOz: true,
    threeDayOz: true,
    sevenDayOz: true,
    avgOz: true,
    analytics: true
  });
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const { users, loading, error, allNurses, refreshData } = useAwsData();

  // Set up form
  const form = useForm<PatientForm>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      weight: "",
      height: "",
      birthday: format(new Date(), "yyyy-MM-dd"),
      gender: "Male",
      deviceSerial: "",
      nurse: "",
      room: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: PatientForm) => {
    try {
      await patientService.createPatient({
        name: data.name,
        weight: Number(data.weight),
        height: Number(data.height),
        birthday: data.birthday,
        gender: data.gender,
        deviceSerial: data.deviceSerial || "N/A",
        nurse: data.nurse || "N/A",
        room: data.room || "N/A",
      });
      toast.success("Patient created successfully");
      setAddPatientOpen(false);
      form.reset();
      // Refresh data
      refreshData();
    } catch (error) {
      toast.error("Failed to create patient");
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    // Update search params when filters change
    const newParams = new URLSearchParams();
    if (selectedNurse) {
      newParams.set("nurse", selectedNurse);
    }
    if (selectedStatus) {
      newParams.set("status", selectedStatus);
    }
    setSearchParams(newParams);
  }, [selectedNurse, selectedStatus, setSearchParams]);

  useEffect(() => {
    // Read filters from URL
    const nurseFromUrl = searchParams.get("nurse");
    const statusFromUrl = searchParams.get("status");
    
    if (nurseFromUrl) {
      setSelectedNurse(nurseFromUrl);
    }
    
    if (statusFromUrl) {
      setSelectedStatus(statusFromUrl);
    }
  }, [searchParams]);

  const handleNurseChange = (value: string) => {
    setSelectedNurse(value === "all" ? null : value);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value === "all" ? null : value);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/dashboard/patient/${userId}`);
  };

  const toggleColumnVisibility = (column: TableColumn) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Filter users by selected nurse and status
  const filteredUsers = users.filter(user => {
    let nurseMatch = true;
    let statusMatch = true;
    
    if (selectedNurse) {
      nurseMatch = user.nursesAssigned.includes(selectedNurse) || user.nurse === selectedNurse;
    }
    
    if (selectedStatus) {
      statusMatch = user.status === selectedStatus;
    }
    
    return nurseMatch && statusMatch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <div className="flex items-center space-x-3">
            <Dialog open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  Column Visibility
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Table Columns</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  {(Object.keys(columnVisibility) as TableColumn[]).map((column) => (
                    <div className="flex items-center space-x-2" key={column}>
                      <Checkbox 
                        id={`column-${column}`} 
                        checked={columnVisibility[column]}
                        onCheckedChange={() => toggleColumnVisibility(column)}
                      />
                      <label 
                        htmlFor={`column-${column}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')}
                      </label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={addPatientOpen} onOpenChange={setAddPatientOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (lbs)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="150" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (inches)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="70" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="birthday"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birthday</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select 
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="deviceSerial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Serial (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Device ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="room"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Number (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="101" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nurse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assigned Nurse (optional)</FormLabel>
                            <Select 
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select nurse" />
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
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Creating..." : "Create Patient"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Filter by Nurse:</span>
            <Select
              value={selectedNurse || "all"}
              onValueChange={handleNurseChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Nurses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nurses</SelectItem>
                {allNurses.map((nurse) => (
                  <SelectItem key={nurse} value={nurse}>
                    {nurse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Filter by Status:</span>
            <Select
              value={selectedStatus || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="hydrated">Hydrated</SelectItem>
                <SelectItem value="mild dehydration">Mild Dehydration</SelectItem>
                <SelectItem value="dehydrated">Dehydrated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnVisibility.name && <TableHead>Name</TableHead>}
                    {columnVisibility.room && <TableHead>Room</TableHead>}
                    {columnVisibility.nurse && <TableHead>Nurse</TableHead>}
                    {columnVisibility.status && <TableHead>Hydration Status</TableHead>}
                    {columnVisibility.todayOz && <TableHead>Today (oz)</TableHead>}
                    {columnVisibility.threeDayOz && <TableHead>3-Day Total (oz)</TableHead>}
                    {columnVisibility.sevenDayOz && <TableHead>7-Day Total (oz)</TableHead>}
                    {columnVisibility.avgOz && <TableHead>Average (oz/day)</TableHead>}
                    {columnVisibility.analytics && <TableHead>Analytics</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: Object.values(columnVisibility).filter(Boolean).length }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length} className="text-center py-8">
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        {columnVisibility.name && (
                          <TableCell>
                            <div className="font-medium">{user.name}</div>
                          </TableCell>
                        )}
                        {columnVisibility.room && <TableCell>{user.room}</TableCell>}
                        {columnVisibility.nurse && <TableCell>{user.nurse}</TableCell>}
                        {columnVisibility.status && (
                          <TableCell>
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
                          </TableCell>
                        )}
                        {columnVisibility.todayOz && (
                          <TableCell>
                            <div className="flex items-center">
                              <Droplets size={16} className="mr-1 text-blue-500" />
                              <span className="font-medium">{user.metrics.todayOunces}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.threeDayOz && (
                          <TableCell>
                            <div className="flex items-center">
                              <Droplets size={16} className="mr-1 text-blue-500" />
                              <span className="font-medium">{user.metrics.threeDayOunces}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.sevenDayOz && (
                          <TableCell>
                            <div className="flex items-center">
                              <Droplets size={16} className="mr-1 text-blue-500" />
                              <span className="font-medium">{user.metrics.sevenDayOunces}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.avgOz && (
                          <TableCell>
                            <div className="flex items-center">
                              <Droplets size={16} className="mr-1 text-blue-500" />
                              <span className="font-medium">{user.metrics.hydration}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.analytics && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserClick(user.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Patients;
