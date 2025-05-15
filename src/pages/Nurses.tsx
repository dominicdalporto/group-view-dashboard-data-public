
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAwsData } from "@/hooks/useAwsData";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Create a schema for the nurse form
const nurseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type NurseForm = z.infer<typeof nurseFormSchema>;

const Nurses = () => {
  const [addNurseOpen, setAddNurseOpen] = useState(false);
  const navigate = useNavigate();
  const { nurses, loading, error, refreshData } = useAwsData();

  // Set up form
  const form = useForm<NurseForm>({
    resolver: zodResolver(nurseFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Handle form submission for adding a nurse
  const onSubmit = async (data: NurseForm) => {
    try {
      // In a real app, you would call your API to add a nurse
      // For now, we'll just show a success message
      toast.success(`Nurse ${data.name} added successfully`);
      setAddNurseOpen(false);
      form.reset();
      // In a real app, refresh the data
      // refreshData();
    } catch (error) {
      toast.error("Failed to add nurse");
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Nurse Management</h1>
          <Dialog open={addNurseOpen} onOpenChange={setAddNurseOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Nurse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Nurse</DialogTitle>
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
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Adding..." : "Add Nurse"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Nurses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Patients</TableHead>
                    <TableHead>Hydration Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : nurses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No nurses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    nurses.map((nurse) => (
                      <TableRow key={nurse.id}>
                        <TableCell>
                          <div className="font-medium">{nurse.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users size={16} className="mr-1 text-gray-500" />
                            <span>{nurse.patientCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { status: 'hydrated', count: nurse.patients.filter(p => p.hydrationStatus === 'hydrated').length },
                              { status: 'mild dehydration', count: nurse.patients.filter(p => p.hydrationStatus === 'mild dehydration').length },
                              { status: 'dehydrated', count: nurse.patients.filter(p => p.hydrationStatus === 'dehydrated').length }
                            ].filter(item => item.count > 0).map((item) => (
                              <Badge
                                key={item.status}
                                className={
                                  item.status === "hydrated"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "mild dehydration"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }
                              >
                                {item.count} {item.status}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/dashboard/patients?nurse=' + encodeURIComponent(nurse.name))}
                          >
                            View Patients
                          </Button>
                        </TableCell>
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

export default Nurses;
