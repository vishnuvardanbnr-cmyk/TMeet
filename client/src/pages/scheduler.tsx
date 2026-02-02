import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { Plus, Video, Trash2, Calendar, Copy, Check, Edit2, X, Mail, Clock, Users, Link2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow, addMinutes } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  id: number;
  title: string;
  scheduledAt: string;
  duration: number;
  roomId: string;
  description?: string;
  endedAt?: string;
}

type FilterType = "all" | "upcoming" | "today" | "past";

export default function SchedulerPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const res = await fetch("/api/meetings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; scheduledAt: string; duration: number }) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/today"] });
      resetForm();
      toast({ title: "Meeting scheduled", description: "Your meeting has been scheduled successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule meeting", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; description?: string; scheduledAt: string; duration: number } }) => {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/today"] });
      resetForm();
      toast({ title: "Meeting updated", description: "Your meeting has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update meeting", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/today"] });
      toast({ title: "Meeting deleted", description: "The meeting has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete meeting", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingMeeting(null);
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setDuration("60");
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setTitle(meeting.title);
    setDescription(meeting.description || "");
    const meetingDate = new Date(meeting.scheduledAt);
    setDate(format(meetingDate, "yyyy-MM-dd"));
    setTime(format(meetingDate, "HH:mm"));
    setDuration(meeting.duration.toString());
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;
    
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const data = { title, description, scheduledAt, duration: parseInt(duration) };
    
    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCopyLink = async (meeting: Meeting) => {
    const meetingUrl = `${window.location.origin}/room/${meeting.roomId}/join`;
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopiedId(meeting.id);
      toast({ title: "Link copied", description: "Meeting link copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({ title: "Copy failed", description: meetingUrl, variant: "destructive" });
    }
  };

  const handleJoinMeeting = (roomId: string) => {
    navigate(`/room/${roomId}/join`);
  };

  const handleInvite = (meetingId: number) => {
    navigate("/mail");
  };

  const getMeetingStatus = (meeting: Meeting) => {
    const scheduledTime = new Date(meeting.scheduledAt);
    const endTime = addMinutes(scheduledTime, meeting.duration);
    const now = new Date();
    
    if (meeting.endedAt) {
      return { label: "Ended", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }
    if (now >= scheduledTime && now <= endTime) {
      return { label: "Live", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    }
    if (isPast(endTime)) {
      return { label: "Past", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }
    if (isToday(scheduledTime)) {
      return { label: "Today", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    }
    if (isTomorrow(scheduledTime)) {
      return { label: "Tomorrow", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    }
    return { label: "Upcoming", color: "bg-primary/20 text-primary border-primary/30" };
  };

  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((meeting) => {
      const scheduledTime = new Date(meeting.scheduledAt);
      const endTime = addMinutes(scheduledTime, meeting.duration);
      
      switch (filter) {
        case "upcoming":
          return !isPast(endTime) || (now >= scheduledTime && now <= endTime);
        case "today":
          return isToday(scheduledTime);
        case "past":
          return isPast(endTime) && !(now >= scheduledTime && now <= endTime);
        default:
          return true;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return filter === "past" ? dateB - dateA : dateA - dateB;
    });
  }, [meetings, filter]);

  const filterCounts = useMemo(() => {
    const now = new Date();
    return {
      all: meetings.length,
      upcoming: meetings.filter(m => {
        const endTime = addMinutes(new Date(m.scheduledAt), m.duration);
        return !isPast(endTime) || (now >= new Date(m.scheduledAt) && now <= endTime);
      }).length,
      today: meetings.filter(m => isToday(new Date(m.scheduledAt))).length,
      past: meetings.filter(m => {
        const scheduledTime = new Date(m.scheduledAt);
        const endTime = addMinutes(scheduledTime, m.duration);
        return isPast(endTime) && !(now >= scheduledTime && now <= endTime);
      }).length,
    };
  }, [meetings]);

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Scheduler</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Plan and schedule your meetings in advance</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Scheduled Meeting</span>
            <span className="sm:hidden">New Meeting</span>
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/20 rounded-2xl border border-white/5 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {editingMeeting ? "Edit Meeting" : "Schedule a Meeting"}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Meeting Topic *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Weekly Team Sync"
                      className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add meeting agenda, notes, or any other details..."
                      rows={3}
                      className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Date *</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        {...(!editingMeeting && { min: format(new Date(), "yyyy-MM-dd") })}
                        className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Time *</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Duration</label>
                      <select 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="180">3 hours</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingMeeting ? "Update Meeting" : "Schedule Meeting"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2">
              {(["upcoming", "today", "past", "all"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {f === "upcoming" && <Clock className="w-3.5 h-3.5" />}
                  {f === "today" && <Calendar className="w-3.5 h-3.5" />}
                  {f === "past" && <Filter className="w-3.5 h-3.5" />}
                  {f === "all" && <Users className="w-3.5 h-3.5" />}
                  <span className="capitalize">{f}</span>
                  <span className="text-xs opacity-70">({filterCounts[f]})</span>
                </button>
              ))}
            </div>

            <div className="bg-secondary/20 rounded-2xl border border-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">
                {filter === "all" ? "All Meetings" : filter === "upcoming" ? "Upcoming Meetings" : filter === "today" ? "Today's Meetings" : "Past Meetings"}
              </h2>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-secondary/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {filter === "all" ? "No meetings scheduled" : `No ${filter} meetings`}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Click "New Scheduled Meeting" to create one
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMeetings.map((meeting) => {
                    const status = getMeetingStatus(meeting);
                    return (
                      <motion.div 
                        key={meeting.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-secondary/30 rounded-xl"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{meeting.title}</p>
                              <Badge variant="outline" className={status.color}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {format(new Date(meeting.scheduledAt), "EEEE, MMM d 'at' h:mm a")} • {meeting.duration} min
                            </p>
                            {meeting.description && (
                              <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-2">
                                {meeting.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {status.label !== "Past" && status.label !== "Ended" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleJoinMeeting(meeting.roomId)}
                                  className="gap-1.5"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  {status.label === "Live" ? "Join Now" : "Start"}
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCopyLink(meeting)}
                                className="gap-1.5"
                              >
                                {copiedId === meeting.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="w-3.5 h-3.5" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleInvite(meeting.id)}
                                className="gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Invite
                              </Button>
                              {status.label !== "Past" && status.label !== "Ended" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(meeting)}
                                  className="gap-1.5"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive gap-1.5"
                                onClick={() => deleteMutation.mutate(meeting.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <CalendarWidget />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
