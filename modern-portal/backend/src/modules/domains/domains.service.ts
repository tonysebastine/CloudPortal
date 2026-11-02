import dns from 'dns/promises';
import { DomainCheckResult } from './domains.model.js';
import { sqlite } from '../../common/database/sqlite.js';

export class DomainLookupService {
  /**
   * Check domain availability via DNS NS lookup + dynamic Admin-controlled TLD pricing
   */
  async checkAvailability(domainName: string): Promise<DomainCheckResult> {
    const cleanDomain = domainName.toLowerCase().trim();
    const parts = cleanDomain.split('.');
    const tld = parts.length > 1 ? `.${parts.slice(1).join('.')}` : '.com';

    // Fetch dynamic pricing set by Admin in DomainTLDs table
    let price = 999;
    try {
      const tldRow: any = sqlite.prepare('SELECT PriceINR, Status FROM DomainTLDs WHERE TLD = ?').get(tld);
      if (tldRow && tldRow.Status === 1) {
        price = tldRow.PriceINR;
      }
    } catch (e) {
      // fallback
    }

    // Check public DNS for active SOA/NS records
    try {
      const records = await dns.resolveNs(cleanDomain);
      if (records && records.length > 0) {
        return {
          domain: cleanDomain,
          available: false,
          pricePerYear: price,
          currency: 'INR',
          tld,
        };
      }
    } catch (err: any) {
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
        return {
          domain: cleanDomain,
          available: true,
          pricePerYear: price,
          currency: 'INR',
          tld,
        };
      }
    }

    return {
      domain: cleanDomain,
      available: true,
      pricePerYear: price,
      currency: 'INR',
      tld,
    };
  }
}

