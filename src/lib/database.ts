// Database connection utility for AWS
import { useState, useEffect } from "react";

// Define our database types
export interface User {
  id: string;
  name: string;
  email: string;
  group: string;
  joinDate: string;
  lastActive: string;
  status: "active" | "inactive" | "pending";
  height: number; // cm
  weight: number; // kg
  gender: "male" | "female" | "other";
  ethnicity: string;
  description: string;
  metrics: {
    logins: number;
    activity: number;
    submissions: number;
    completionRate: number;
  };
  activityData: {
    date: string;
    value: number;
  }[];
}

export interface Group {
  id: string;
  name: string;
  userCount: number;
  description: string;
}

// Mock data for development
// In production, this would be replaced with real AWS database connections
const mockGroups: Group[] = [
  {
    id: "g1",
    name: "Marketing",
    userCount: 4,
    description: "Marketing department users"
  },
  {
    id: "g2",
    name: "Engineering",
    userCount: 6,
    description: "Engineering team members"
  },
  {
    id: "g3",
    name: "Sales",
    userCount: 5,
    description: "Sales team representatives"
  },
  {
    id: "g4",
    name: "Support",
    userCount: 3,
    description: "Customer support specialists"
  }
];

const mockUsers: User[] = [
  // Marketing Group
  {
    id: "u1",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    group: "g1",
    joinDate: "2023-02-15",
    lastActive: "2023-04-22",
    status: "active",
    height: 167,
    weight: 62,
    gender: "female",
    ethnicity: "Caucasian",
    description: "Sarah is a marketing specialist with 5 years of experience in digital campaigns.",
    metrics: {
      logins: 45,
      activity: 78,
      submissions: 12,
      completionRate: 92
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 50) + 30
    }))
  },
  {
    id: "u2",
    name: "James Wilson",
    email: "james.w@example.com",
    group: "g1",
    joinDate: "2023-03-01",
    lastActive: "2023-04-20",
    status: "active",
    height: 180,
    weight: 75,
    gender: "male",
    ethnicity: "African American",
    description: "James oversees content strategy and is known for creative problem solving.",
    metrics: {
      logins: 36,
      activity: 65,
      submissions: 8,
      completionRate: 87
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 40) + 25
    }))
  },
  {
    id: "u3",
    name: "Emily Davis",
    email: "emily.d@example.com",
    group: "g1",
    joinDate: "2023-01-20",
    lastActive: "2023-04-21",
    status: "active",
    height: 170,
    weight: 64,
    gender: "female",
    ethnicity: "Asian",
    description: "Emily brings innovation to every campaign, with a focus on analytical marketing.",
    metrics: {
      logins: 52,
      activity: 82,
      submissions: 15,
      completionRate: 95
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 45) + 35
    }))
  },
  {
    id: "u4",
    name: "Robert Brown",
    email: "robert.b@example.com",
    group: "g1",
    joinDate: "2023-02-10",
    lastActive: "2023-04-15",
    status: "inactive",
    height: 176,
    weight: 81,
    gender: "male",
    ethnicity: "Latino",
    description: "Robert specializes in brand outreach and has a love for creative design.",
    metrics: {
      logins: 28,
      activity: 45,
      submissions: 6,
      completionRate: 75
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 30) + 20
    }))
  },
  // Engineering Group
  {
    id: "u5",
    name: "Michael Chen",
    email: "michael.c@example.com",
    group: "g2",
    joinDate: "2022-11-15",
    lastActive: "2023-04-22",
    status: "active",
    height: 172,
    weight: 73,
    gender: "male",
    ethnicity: "Asian",
    description: "Lead engineer with a passion for optimizing scalable backend systems.",
    metrics: {
      logins: 68,
      activity: 92,
      submissions: 24,
      completionRate: 98
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 60) + 40
    }))
  },
  {
    id: "u6",
    name: "Jessica Kim",
    email: "jessica.k@example.com",
    group: "g2",
    joinDate: "2022-12-05",
    lastActive: "2023-04-21",
    status: "active",
    height: 175,
    weight: 70,
    gender: "female",
    ethnicity: "Caucasian",
    description: "Jessica is a senior engineer with expertise in full-stack development.",
    metrics: {
      logins: 62,
      activity: 88,
      submissions: 22,
      completionRate: 96
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 55) + 35
    }))
  },
  // Additional engineers...
  {
    id: "u7",
    name: "David Miller",
    email: "david.m@example.com",
    group: "g2",
    joinDate: "2023-01-10",
    lastActive: "2023-04-20",
    status: "active",
    height: 178,
    weight: 78,
    gender: "male",
    ethnicity: "African American",
    description: "David is a team lead with a strong background in project management.",
    metrics: {
      logins: 56,
      activity: 85,
      submissions: 20,
      completionRate: 94
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 50) + 45
    }))
  },
  // More engineers...
  {
    id: "u8",
    name: "Anna Rodriguez",
    email: "anna.r@example.com",
    group: "g2",
    joinDate: "2022-09-20",
    lastActive: "2023-04-18",
    status: "inactive",
    height: 165,
    weight: 55,
    gender: "female",
    ethnicity: "Asian",
    description: "Anna is a junior engineer with a focus on front-end development.",
    metrics: {
      logins: 42,
      activity: 65,
      submissions: 15,
      completionRate: 82
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 40) + 30
    }))
  },
  // Sales Group
  {
    id: "u9",
    name: "Thomas Wright",
    email: "thomas.w@example.com",
    group: "g3",
    joinDate: "2022-10-10",
    lastActive: "2023-04-22",
    status: "active",
    height: 170,
    weight: 68,
    gender: "male",
    ethnicity: "Caucasian",
    description: "Thomas is a sales representative with a strong understanding of customer needs.",
    metrics: {
      logins: 58,
      activity: 76,
      submissions: 32,
      completionRate: 91
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 70) + 20
    }))
  },
  // More sales people...
  // Support Group
  {
    id: "u15",
    name: "Lisa Johnson",
    email: "lisa.j@example.com",
    group: "g4",
    joinDate: "2022-11-05",
    lastActive: "2023-04-22",
    status: "active",
    height: 160,
    weight: 58,
    gender: "female",
    ethnicity: "African American",
    description: "Lisa is a customer support specialist with a focus on resolving complex issues.",
    metrics: {
      logins: 72,
      activity: 94,
      submissions: 42,
      completionRate: 97
    },
    activityData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 40) + 55
    }))
  }
];

// Simulates a database fetch with loading state
export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setGroups(mockGroups);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch groups");
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return { groups, loading, error };
}

// Fetch users by group ID
export function useUsersByGroup(groupId: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const filteredUsers = groupId 
          ? mockUsers.filter(user => user.group === groupId)
          : mockUsers;
          
        setUsers(filteredUsers);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch users");
        setLoading(false);
      }
    };

    fetchUsers();
  }, [groupId]);

  return { users, loading, error };
}

// Get a single user by ID
export function useUser(userId: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        const foundUser = mockUsers.find(u => u.id === userId) || null;
        setUser(foundUser);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch user");
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
}
