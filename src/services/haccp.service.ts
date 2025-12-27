/**
 * HACCP 인증업체 조회 서비스
 */

import type {
  HaccpApiResponse,
  HaccpCompanyItem,
  HaccpSearchParams,
} from '../types/api/gov-data/haccp.types.js';
import {
  GovDataClient,
  createGovDataClient,
} from '../utils/gov-data-client.js';

const HACCP_API_ENDPOINT =
  '/B553748/CertCompanyListService2/getCertCompanyListService2';

export interface HaccpCertification {
  certificationNo: string;
  company: string;
  address: string;
  certifiedDate: string;
  expirationDate: string;
  isCertified: boolean;
}

export interface HaccpSearchResult {
  totalCount: number;
  items: HaccpCertification[];
}

export class HaccpService {
  constructor(private readonly client: GovDataClient) {}

  async searchByName(
    companyName: string,
    params?: HaccpSearchParams,
  ): Promise<HaccpSearchResult> {
    const response = await this.client.fetch<HaccpApiResponse>(
      HACCP_API_ENDPOINT,
      {
        company: companyName,
        pageNo: String(params?.pageNo || 1),
        numOfRows: String(params?.numOfRows || 10),
      },
    );

    const totalCount = parseInt(response.body.totalCount, 10) || 0;

    if (totalCount === 0 || !response.body.items) {
      return { totalCount: 0, items: [] };
    }

    const rawItems = response.body.items.item;
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return {
      totalCount,
      items: items.map((item) => this.mapToCertification(item)),
    };
  }

  async isCompanyCertified(companyName: string): Promise<boolean> {
    const result = await this.searchByName(companyName, { numOfRows: 1 });
    return result.totalCount > 0;
  }

  private mapToCertification(item: HaccpCompanyItem): HaccpCertification {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const expDate = item.issueenddate?.replace(/-/g, '') || '';

    return {
      certificationNo: item.appointno,
      company: item.company,
      address: item.worksaddr,
      certifiedDate: item.issuedate,
      expirationDate: item.issueenddate,
      isCertified: expDate >= today,
    };
  }
}

export function createHaccpService(client?: GovDataClient): HaccpService {
  return new HaccpService(client || createGovDataClient());
}
