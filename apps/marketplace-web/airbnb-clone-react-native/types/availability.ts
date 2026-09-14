export type ApiTimeSlot = {
  staff_id: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
};

export type ApiStaffMember = {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: ApiTimeSlot[];
};

export type ApiDayAvailability = {
  dayName: string;
  staff: {
    [staffId: string]: ApiStaffMember;
  };
};

export type Availabilities = {
  dates: {
    [key: string]: ApiDayAvailability;
  };
};

export type TimeSlot = {
  time: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
  staffImage?: string | null;
};
