export interface Client {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ClientNote {
  id: string;
  companyId: string;
  clientId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ClientSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  rank: number;
}

export interface ClientNameLookup {
  id: string;
  firstName: string | null;
  lastName: string | null;
}
