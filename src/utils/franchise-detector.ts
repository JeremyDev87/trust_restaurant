/**
 * 프랜차이즈 판별 유틸리티
 */

export const FRANCHISE_BRANDS = [
  '스타벅스', 'STARBUCKS', '투썸플레이스', '이디야', '빽다방', '메가커피',
  '컴포즈커피', '더벤티', '커피빈', '폴바셋', '할리스', '엔제리너스',
  '파스쿠찌', '카페베네', '탐앤탐스', '공차', '쥬시',
  '맥도날드', '버거킹', '롯데리아', 'KFC', '맘스터치', '노브랜드버거',
  '서브웨이', '파파이스', '쉐이크쉑', '파이브가이즈',
  'BBQ', 'BHC', '굽네치킨', '교촌치킨', '네네치킨', '또래오래',
  '페리카나', '호식이두마리치킨', '지코바', '푸라닭',
  '도미노피자', '피자헛', '미스터피자', '파파존스', '피자스쿨', '7번가피자',
  '본죽', '김밥천국', '김가네', '죽이야기', '놀부', '명륜진사갈비',
  '새마을식당', '백종원', '홍콩반점', '역전우동', '하남돼지집',
  '죠스떡볶이', '신전떡볶이', '청년다방', '응급실떡볶이',
  '스시로', '쿠우쿠우', '미소야',
  '이삭토스트', '뚜레쥬르', '파리바게뜨', 'SPC', 'CJ',
] as const;

export function isFranchise(name: string): boolean {
  if (!name) return false;
  const normalizedName = name.toUpperCase().replace(/\s+/g, '');
  return FRANCHISE_BRANDS.some(brand => {
    const normalizedBrand = brand.toUpperCase().replace(/\s+/g, '');
    return normalizedName.includes(normalizedBrand);
  });
}
