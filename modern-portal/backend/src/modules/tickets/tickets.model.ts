export interface Ticket {
  id: number;
  reference?: number;
  referenceNo?: string;
  serviceTypeId?: number;
  productId?: number;
  priority: number; // 1: Low, 2: Medium, 3: High, 4: Urgent
  subject: string;
  description: string;
  filePath?: string;
  status: boolean; // true: Open, false: Closed
  createdBy: number;
  created: string;
  modified?: string;
  postedBy?: number;
}

export interface TicketReply {
  id: number;
  ticketsId: number;
  description: string;
  filePath?: string;
  createdBy: number;
  userType: boolean; // 0: Admin/Staff, 1: Customer
  status: boolean;
  created: string;
}

export interface CreateTicketDto {
  serviceTypeId?: number;
  productId?: number;
  priority?: number;
  subject: string;
  description: string;
  filePath?: string;
}

export interface CreateTicketReplyDto {
  ticketsId: number;
  description: string;
  filePath?: string;
}

