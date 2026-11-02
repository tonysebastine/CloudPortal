export interface Domain {
  id: number;
  userId: number;
  name: string;
  domainYear: number;
  expiryDate: string;
  status: boolean; // true = Active, false = Expired/Pending
  created: string;
  modified?: string;
  authCode?: string;
  nameServers?: string[];
}

export interface RegisterDomainDto {
  name: string;
  domainYear: number;
  nameServers?: string[];
  authCode?: string;
}

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  pricePerYear: number;
  currency: string;
  tld: string;
}

export interface UpdateNameserversDto {
  domainId: number;
  nameservers: string[];
}

