export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  itemId?: number;
  serviceType?: boolean;
  description: string;
  annualPrice: number;
  discountPrice?: number;
  totalPrice: number;
  quantity: number;
  duration?: number;
  startDate?: string;
  endDate?: string;
  productCode?: string;
}

export interface Invoice {
  id: number;
  reference?: number;
  referenceId: string;
  poNumber?: string;
  billTo: string;
  billDate: string;
  dueDate: string;
  userId: number;
  status: boolean;
  comments?: string;
  paymentTerms?: string;
  modeOfPayment?: string;
  statusOfInvoice: 'Unpaid' | 'Paid' | 'Cancelled' | 'Refunded';
  invoiceCurrency: string;
  recieptNumber?: number;
  isCancel: boolean;
  international: boolean;
  items?: InvoiceItem[];
  totalAmount?: number;
  created: string;
}

export interface CreateInvoiceDto {
  poNumber?: string;
  billTo: string;
  dueDate: string;
  comments?: string;
  paymentTerms?: string;
  modeOfPayment?: string;
  invoiceCurrency?: string;
  items: InvoiceItem[];
}

export interface Transaction {
  id: number;
  referenceId: string;
  amount: number;
  description: string;
  statusMessage: string;
  currency: string;
  userId: number;
  invoiceId: number;
  status: boolean;
  ip?: string;
  created: string;
}

export interface CreateTransactionDto {
  invoiceId: number;
  amount: number;
  currency: string;
  description: string;
  referenceId: string; // e.g. Payment gateway payment ID (Razorpay/PayPal/CCAvenue)
  statusMessage?: string;
}

