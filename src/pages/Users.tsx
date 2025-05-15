
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
import { Droplets } from "lucide-react";

const Users = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedNurse, setSelectedNurse] = useState<string | null>(
    searchParams.get("nurse") || null
  );
  const navigate = useNavigate();
  const { users, loading, error } = useAwsData();

  // Get unique nurses from users
  const uniqueNurses = Array.from(new Set(users.map(user => user.nurse))).sort();

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (selectedNurse) {
      searchParams.set("nurse", selectedNurse);
    } else {
      searchParams.delete("nurse");
    }
    setSearchParams(searchParams);
  }, [selectedNurse, searchParams, setSearchParams]);

  useEffect(() => {
    const nurseFromUrl = searchParams.get("nurse");
    if (nurseFromUrl) {
      setSelectedNurse(nurseFromUrl);
    }
  }, [searchParams]);

  const handleNurseChange = (value: string) => {
    setSelectedNurse(value === "all" ? null : value);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/dashboard/user/${userId}`);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Filter users by selected nurse
  const filteredUsers = selectedNurse
    ? users.filter(user => user.nurse === selectedNurse)
    : users;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 mr-2">Filter by Nurse:</span>
            <Select
              value={selectedNurse || "all"}
              onValueChange={handleNurseChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Nurses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nurses</SelectItem>
                {uniqueNurses.map((nurse) => (
                  <SelectItem key={nurse} value={nurse}>
                    {nurse}
                  </SelectItem>
                ))}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Nurse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hydration (oz/day)</TableHead>
                    <TableHead>First Record</TableHead>
                    <TableHead>Last Record</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                        </TableCell>
                        <TableCell>{user.room}</TableCell>
                        <TableCell>{user.nurse}</TableCell>
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
                        <TableCell>
                          <div className="flex items-center">
                            <Droplets size={16} className="mr-1 text-blue-500" />
                            <span className="font-medium">{user.metrics.hydration}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.joinDate)}</TableCell>
                        <TableCell>{formatDate(user.lastActive)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserClick(user.id)}
                          >
                            View
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

export default Users;
