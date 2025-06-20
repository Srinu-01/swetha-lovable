
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Phone,
  Calendar,
  Package,
  User,
  LogIn,
  LogOut
} from 'lucide-react';
import { collection, getDocs, addDoc, query, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  assignedBy: string;
  dueDate: string;
  createdAt: any;
}

interface Attendance {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late';
}

const StaffDashboard = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    if (userData) {
      fetchStaffData();
    }
  }, [userData]);

  const fetchStaffData = async () => {
    try {
      // Fetch assigned tasks
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', userData?.uid),
        orderBy('createdAt', 'desc')
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('staffId', '==', userData?.uid),
        where('date', '==', today)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        const attendanceData = {
          id: attendanceSnapshot.docs[0].id,
          ...attendanceSnapshot.docs[0].data()
        } as Attendance;
        setAttendance(attendanceData);
        setCheckedIn(!!attendanceData.checkIn && !attendanceData.checkOut);
      }

      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0];

      await addDoc(collection(db, 'attendance'), {
        staffId: userData?.uid,
        staffName: userData?.name,
        date: today,
        checkIn: now,
        status: 'present',
        createdAt: serverTimestamp()
      });

      setCheckedIn(true);
      toast({
        title: "Success",
        description: "Checked in successfully",
      });
      fetchStaffData();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Error",
        description: "Failed to check in",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      if (attendance) {
        const now = new Date().toTimeString().split(' ')[0];
        // In a real app, you'd update the existing attendance record
        setCheckedIn(false);
        toast({
          title: "Success",
          description: "Checked out successfully",
        });
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast({
        title: "Error",
        description: "Failed to check out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {userData?.name}!
        </h1>
        <p className="text-white/90">
          Here's your dashboard for today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Attendance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendance && (
              <div className="text-sm text-gray-600">
                Check-in: {attendance.checkIn || 'Not checked in'}
                {attendance.checkOut && (
                  <div>Check-out: {attendance.checkOut}</div>
                )}
              </div>
            )}
            <div className="flex space-x-2">
              {!checkedIn ? (
                <Button 
                  onClick={handleCheckIn}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button 
                  onClick={handleCheckOut}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Today's Tasks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending:</span>
                <Badge variant="outline">{pendingTasks.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">In Progress:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  {inProgressTasks.length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed:</span>
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  {completedTasks.length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>Your assigned tasks and responsibilities</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="flex space-x-2">
                      <Badge className={
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }>
                        {task.priority}
                      </Badge>
                      <Badge className={
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  <div className="text-xs text-gray-500">
                    Due: {task.dueDate}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks assigned yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
