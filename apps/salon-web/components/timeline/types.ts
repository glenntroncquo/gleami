export interface TimelineTask {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: "pink" | "purple" | "green" | "blue" | "orange" | "teal";
  staffId: string;
  staffName: string;
  staffAvatar?: string;
}

export interface TimelineUnavailability {
  id: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
}

export interface TimelineStaff {
  id: string;
  name: string;
  avatar?: string;
  tasks: TimelineTask[];
  unavailabilities?: TimelineUnavailability[];
}

export type TabFilter = "all" | "backlog" | "active" | "closed";
